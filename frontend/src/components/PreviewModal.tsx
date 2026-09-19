import { lazy, Suspense } from 'react'
import { AIPreview } from './AIPreview'
import type { GlazeComposer } from '../hooks/useGlazeComposer'
import { ATMOSPHERE_OPTIONS, CLAY_BODY_OPTIONS, COOLING_OPTIONS, LIGHTING_OPTIONS, THICKNESS_OPTIONS } from '../app/constants'

let realisticTilePreview3DPromise: Promise<typeof import('./RealisticTilePreview3D')> | null = null

function preloadRealisticTilePreview3D() {
  if (!realisticTilePreview3DPromise) {
    realisticTilePreview3DPromise = import('./RealisticTilePreview3D')
  }
  return realisticTilePreview3DPromise
}

const RealisticTilePreview3D = lazy(() =>
  preloadRealisticTilePreview3D().then((module) => ({
    default: module.RealisticTilePreview3D,
  })),
)

interface Props {
  composer: GlazeComposer
}

export function PreviewModal({ composer }: Props) {
  const {
    activePreviewModal,
    closePreview,
    hasGeneratedRecipes,
    materialProfile,
    modalPanelRef,
    previewSeedKey,
    realismControls,
    setRealismControls,
    form,
    selectedRecipe,
  } = composer

  if (!activePreviewModal || !hasGeneratedRecipes) {
    return null
  }

  return (
    <div
      className="modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label={activePreviewModal === 'ai' ? 'Local glaze concept renderer' : 'Realistic glaze tile renderer'}
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          closePreview()
        }
      }}
    >
      <div className="modal-panel" ref={modalPanelRef} tabIndex={-1}>
        <div className="modal-head">
          <h3>{activePreviewModal === 'ai' ? 'Local Glaze Concept Render' : 'Realistic Test Tile Render'}</h3>
          <button type="button" className="ghost-btn" onClick={closePreview}>
            Close
          </button>
        </div>

        {activePreviewModal === 'ai' ? (
          <AIPreview
            material={materialProfile}
            seedKey={previewSeedKey}
            lighting={realismControls.lighting}
            clayBody={realismControls.clayBody}
            effect={form.effects[0] ?? 'None'}
            selectedRecipeName={selectedRecipe?.name}
            selectedRecipeFiringRange={selectedRecipe?.firingRange}
            selectedRecipeRationale={selectedRecipe?.rationale}
            selectedRecipeIngredients={selectedRecipe?.ingredients}
          />
        ) : (
          <Suspense fallback={<p className="glaze-preview-caption">Loading 3D renderer...</p>}>
            <RealisticTilePreview3D
              material={materialProfile}
              lighting={realismControls.lighting}
              clayBody={realismControls.clayBody}
              effect={form.effects[0] ?? 'None'}
              seedKey={previewSeedKey}
            />
          </Suspense>
        )}

        {activePreviewModal === 'realistic' ? (
          <div className="realism-controls">
            <h3>Realism Controls</h3>
            <div className="realism-grid">
              <label>
                Clay body
                <select
                  value={realismControls.clayBody}
                  onChange={(event) =>
                    setRealismControls({
                      ...realismControls,
                      clayBody: event.target.value as (typeof CLAY_BODY_OPTIONS)[number],
                    })
                  }
                >
                  {CLAY_BODY_OPTIONS.map((option) => (
                    <option key={option}>{option}</option>
                  ))}
                </select>
              </label>

              <label>
                Thickness
                <select
                  value={realismControls.thickness}
                  onChange={(event) =>
                    setRealismControls({
                      ...realismControls,
                      thickness: event.target.value as (typeof THICKNESS_OPTIONS)[number],
                    })
                  }
                >
                  {THICKNESS_OPTIONS.map((option) => (
                    <option key={option}>{option}</option>
                  ))}
                </select>
              </label>

              <label>
                Atmosphere
                <select
                  value={realismControls.atmosphere}
                  onChange={(event) =>
                    setRealismControls({
                      ...realismControls,
                      atmosphere: event.target.value as (typeof ATMOSPHERE_OPTIONS)[number],
                    })
                  }
                >
                  {ATMOSPHERE_OPTIONS.map((option) => (
                    <option key={option}>{option}</option>
                  ))}
                </select>
              </label>

              <label>
                Cooling profile
                <select
                  value={realismControls.cooling}
                  onChange={(event) =>
                    setRealismControls({
                      ...realismControls,
                      cooling: event.target.value as (typeof COOLING_OPTIONS)[number],
                    })
                  }
                >
                  {COOLING_OPTIONS.map((option) => (
                    <option key={option}>{option}</option>
                  ))}
                </select>
              </label>

              <label>
                Lighting preset
                <select
                  value={realismControls.lighting}
                  onChange={(event) =>
                    setRealismControls({
                      ...realismControls,
                      lighting: event.target.value as (typeof LIGHTING_OPTIONS)[number],
                    })
                  }
                >
                  {LIGHTING_OPTIONS.map((option) => (
                    <option key={option}>{option}</option>
                  ))}
                </select>
              </label>
            </div>
          </div>
        ) : (
          <div className="ai-modal-note">
            <p className="glaze-preview-caption">
              This modal shows the AI concept render only. Use the preview controls to compare it with the fast preview.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
