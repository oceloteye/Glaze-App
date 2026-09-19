import type { GlazeComposer } from '../hooks/useGlazeComposer'

interface Props {
  composer: GlazeComposer
}

export function RecipeResultsPanel({ composer }: Props) {
  const { recipes, handlePrint, handleExportJson } = composer

  return (
    <section className="panel results-panel">
      <h2>Recipe Suggestions</h2>
      {recipes.length === 0 ? (
        <p className="empty-msg">Submit parameters to get glaze composition options.</p>
      ) : (
        <>
          <div className="results-actions">
            <button type="button" className="ghost-btn" onClick={handlePrint}>
              Print Recipe Sheet
            </button>
            <button type="button" className="ghost-btn" onClick={handleExportJson}>
              Export JSON
            </button>
          </div>
          <div className="recipe-list">
            {recipes.map((recipe) => (
              <article className="recipe-card" key={recipe.name}>
                <div className="recipe-head">
                  <h3>{recipe.name}</h3>
                  <span>{recipe.firingRange}</span>
                </div>
                <p>{recipe.rationale}</p>
                <ul>
                  {Object.entries(recipe.ingredients).map(([ingredient, percent]) => (
                    <li key={ingredient}>
                      <strong>{ingredient}</strong>
                      <span>{percent.toFixed(2)}%</span>
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </>
      )}
    </section>
  )
}
