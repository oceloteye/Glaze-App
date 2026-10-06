import './App.css'
import { BrowserRouter, Outlet, Route, Routes } from 'react-router'
import { SiteHeader } from './components/SiteHeader'
import { HomePage } from './pages/HomePage'
import { RecipeGeneratorPage } from './pages/RecipeGeneratorPage'

function Layout() {
  return (
    <div className="page-shell">
      <SiteHeader />
      <main>
        <Outlet />
      </main>
      <footer className="page-footer">
        Enjoying Glaze Lab?{' '}
        <a href="https://ko-fi.com/ecoce" target="_blank" rel="noopener noreferrer">
          Support it on Ko-fi
        </a>
      </footer>
    </div>
  )
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<HomePage />} />
          <Route path="generator" element={<RecipeGeneratorPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App