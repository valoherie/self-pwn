import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import './lib/storage'
import Jar from './slip-jar.jsx'
import ReactDOM from 'react-dom/client'
ReactDOM.createRoot(document.getElementById('root')).render(<Jar />)