"""push waits for a NoteModifyAck per sent NoteModify before disconnecting.

Run: PYTHONPATH=. python -m unittest discover -s tests
"""

from __future__ import annotations

import asyncio
import random
import tempfile
import unittest
from pathlib import Path
from unittest import mock

from click.testing import CliRunner

from fns_cli import main as cli_main
from fns_cli.config import AppConfig
from fns_cli.protocol import (
    ACTION_NOTE_MODIFY,
    ACTION_NOTE_MODIFY_ACK,
    ACTION_NOTE_SYNC,
    ACTION_NOTE_SYNC_END,
    ACTION_NOTE_SYNC_MTIME,
    ACTION_NOTE_SYNC_NEED_PUSH,
    WSMessage,
)
from fns_cli.sync_engine import SyncEngine


class FakeServer:
    """Stands in for WSClient and mimics the FNS server's ordering.

    Like the real server, NoteSync is answered with NoteSyncEnd *first* and
    the queued NoteSyncNeedPush messages afterwards, streamed ``need_push_gap``
    seconds apart (as over a real network). Each NoteModify is acked
    after a random delay (acks may arrive out of order), except for paths in
    ``drop_acks`` and ``mtime_only`` (answered with NoteSyncMtime instead).
    """

    def __init__(self, drop_acks=(), mtime_only=(), need_push_gap=0.05) -> None:
        self.need_push_gap = need_push_gap
        self.drop_acks = set(drop_acks)
        self.mtime_only = set(mtime_only)
        self.sent: list[WSMessage] = []
        self.acked: list[str] = []  # acks delivered to the client
        self.closed = False
        self.closed_with_pending: list[str] | None = None
        self._handlers = {}
        self._inbox: asyncio.Queue[WSMessage] = asyncio.Queue()
        self._ready = asyncio.Event()
        self._tasks: list[asyncio.Task] = []
        self.engine: SyncEngine | None = None

    # ── WSClient surface used by SyncEngine ──
    def on(self, action, handler):
        self._handlers[action] = handler

    def on_binary(self, handler):
        pass

    def on_reconnect(self, handler):
        pass

    async def wait_ready(self, timeout: float = 30) -> bool:
        return True

    async def send(self, msg: WSMessage) -> None:
        self.sent.append(msg)
        if msg.action == ACTION_NOTE_SYNC:
            self._tasks.append(asyncio.create_task(self._answer_note_sync(msg.data)))
        elif msg.action == ACTION_NOTE_MODIFY:
            self._tasks.append(asyncio.create_task(self._answer_modify(msg.data)))

    async def send_bytes(self, data: bytes) -> None:
        pass

    async def run(self) -> None:
        # Dispatch sequentially, like WSClient._listen.
        while True:
            msg = await self._inbox.get()
            handler = self._handlers.get(msg.action)
            if handler:
                await handler(msg)

    async def close(self) -> None:
        self.closed = True
        self.closed_with_pending = self.engine.note_sync.pending_ack_paths
        for t in self._tasks:
            t.cancel()

    # ── simulated server behaviour ──
    def _push(self, action: str, data: dict) -> None:
        if not self.closed:
            self._inbox.put_nowait(WSMessage(action, {"code": 1, "data": data}))

    async def _answer_note_sync(self, data: dict) -> None:
        notes = data["notes"]
        self._push(ACTION_NOTE_SYNC_END, {
            "lastTime": 123,
            "needUploadCount": len(notes),
            "needModifyCount": 0,
            "needDeleteCount": 0,
        })
        for n in notes:
            await asyncio.sleep(self.need_push_gap)
            self._push(ACTION_NOTE_SYNC_NEED_PUSH, {"path": n["path"], "pathHash": n["pathHash"]})

    async def _answer_modify(self, data: dict) -> None:
        path = data["path"]
        await asyncio.sleep(random.uniform(0.01, 0.2))
        if path in self.drop_acks or self.closed:
            return
        if path in self.mtime_only:
            self._push(ACTION_NOTE_SYNC_MTIME, {"path": path, "mtime": data["mtime"]})
        else:
            self._push(ACTION_NOTE_MODIFY_ACK, {
                "lastTime": 456, "path": path, "pathHash": data["pathHash"],
            })
        self.acked.append(path)


def _make_engine(vault: Path, n_notes: int, **server_kw) -> tuple[SyncEngine, FakeServer]:
    for i in range(n_notes):
        (vault / f"post-{i:02d}.md").write_text(f"# Post {i}\n", encoding="utf-8")
    cfg = AppConfig()
    cfg.server.api = "http://fns.test"
    cfg.server.token = "test"
    cfg.sync.watch_path = str(vault)
    cfg.sync.sync_files = False
    cfg.sync.sync_config = False
    engine = SyncEngine(cfg)
    server = FakeServer(**server_kw)
    server.engine = engine
    engine.ws_client = server
    return engine, server


class PushAckTest(unittest.IsolatedAsyncioTestCase):
    def setUp(self) -> None:
        self._tmp = tempfile.TemporaryDirectory()
        self.vault = Path(self._tmp.name)

    def tearDown(self) -> None:
        self._tmp.cleanup()

    def _modified_paths(self, server: FakeServer) -> list[str]:
        return sorted(m.data["path"] for m in server.sent if m.action == ACTION_NOTE_MODIFY)

    async def test_waits_for_every_ack_before_closing(self):
        engine, server = _make_engine(self.vault, 13)

        ok = await engine.push(ack_timeout=5)

        self.assertTrue(ok)
        expected = [f"post-{i:02d}.md" for i in range(13)]
        self.assertEqual(self._modified_paths(server), expected)
        self.assertEqual(sorted(server.acked), expected)
        self.assertEqual(server.closed_with_pending, [])

    async def test_mtime_reply_counts_as_confirmation(self):
        engine, server = _make_engine(self.vault, 3, mtime_only={"post-01.md"})

        self.assertTrue(await engine.push(ack_timeout=5))
        self.assertEqual(server.closed_with_pending, [])

    async def test_timeout_reports_unacked_paths(self):
        dropped = {"post-03.md", "post-11.md"}
        engine, server = _make_engine(self.vault, 13, drop_acks=dropped)

        with self.assertLogs("fns_cli.sync_engine", level="ERROR") as logs:
            ok = await engine.push(ack_timeout=0.5)

        self.assertFalse(ok)
        self.assertEqual(server.closed_with_pending, sorted(dropped))
        out = "\n".join(logs.output)
        for path in dropped:
            self.assertIn(path, out)
        self.assertNotIn("post-04.md", out)


class PushExitCodeTest(unittest.TestCase):
    def _invoke(self, push_result: bool):
        with tempfile.TemporaryDirectory() as tmp:
            cfg = Path(tmp) / "config.yaml"
            cfg.write_text(
                f'server: {{api: "http://fns.test", token: "t"}}\n'
                f'sync: {{watch_path: "{tmp}"}}\n',
                encoding="utf-8",
            )

            async def fake_push(self):
                return push_result

            with mock.patch.object(SyncEngine, "push", fake_push):
                return CliRunner().invoke(cli_main.cli, ["push", "-c", str(cfg)])

    def test_success_exits_zero(self):
        result = self._invoke(True)
        self.assertEqual(result.exit_code, 0, result.output)
        self.assertIn("Push complete.", result.output)

    def test_failure_exits_nonzero(self):
        result = self._invoke(False)
        self.assertEqual(result.exit_code, 1, result.output)
        self.assertNotIn("Push complete.", result.output)


if __name__ == "__main__":
    unittest.main()
