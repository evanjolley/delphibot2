import React from 'react'
import ReactDOM from 'react-dom/client'
import { MantineProvider } from '@mantine/core'
import { Notifications } from '@mantine/notifications'
import App from './app'
import '@mantine/core/styles.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <MantineProvider>
      <Notifications 
        position="top-right"
        containerWidth={300}
        autoClose={3000}
        zIndex={2077}
        style={{ position: 'fixed' }}
      />
      <App />
    </MantineProvider>
  </React.StrictMode>
)
