import { render } from 'preact';
import '@opennote/ui/styles.css';
import './admin-theme.css';
import { App } from './app.js';

document.documentElement.setAttribute('data-admin-theme', 'light');

render(<App />, document.getElementById('app')!);
