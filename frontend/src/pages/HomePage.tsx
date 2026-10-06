import { Link } from 'react-router'

export function HomePage() {
  return (
    <>
      <section className="intro-card">
        <h1>Glaze Lab</h1>
        <p className="subtitle">
          Tools for designing ceramic glazes. Describe the colour, cone, finish, melt and opacity
          you're after and get candidate recipes with chemistry you can inspect — then prove them
          on test tiles.
        </p>
        <div className="hero__actions">
          <Link to="/generator" className="button button--primary">
            Open the Recipe Generator
          </Link>
        </div>
      </section>

      <section className="support-card">
        <div>
          <h2>Support Glaze Lab</h2>
          <p>
            Glaze Lab is free to use. If it saves you a few test tiles, a coffee helps keep the kiln
            running.
          </p>
        </div>
        <a
          href="https://ko-fi.com/ecoce"
          target="_blank"
          rel="noopener noreferrer"
          className="button button--primary"
        >
          Support on Ko-fi
        </a>
      </section>
    </>
  )
}
