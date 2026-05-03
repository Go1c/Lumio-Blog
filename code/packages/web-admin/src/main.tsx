import { render } from 'preact';
import '@opennote/ui/styles.css';
import { App } from './app.js';

render(<App />, document.getElementById('app')!);
