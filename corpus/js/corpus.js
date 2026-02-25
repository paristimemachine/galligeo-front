async function loadCorpora() {
  try {
    const response = await fetch('./data/corpora.json');
    if (!response.ok) {
      throw new Error('Failed to load corpora data');
    }
    const corpora = await response.json();
    renderCards(corpora);
  } catch (error) {
    console.error('Error loading corpora:', error);
  }
}

function renderCards(corpora) {
  const cardsContainer = document.getElementById('cardsContainer');
  
  corpora.forEach(corpus => {
    const cardHTML = `
      <div class="fr-col-12 fr-col-md-6 fr-col-lg-4">
        <div class="fr-card fr-card--horizontal corpus-card fr-enlarge-link">
          <div class="fr-card__body">
            <h3 class="fr-card__title">
              <a href="./cartes/?nom=${corpus.nom}">${corpus.titre}</a>
            </h3>
            <p class="fr-card__desc fr-text--sm fr-mb-2w">
              ${corpus.description}
            </p>
          </div>
          <div class="fr-card__footer">
            <a class="fr-btn fr-btn--sm" href="./cartes/?nom=${corpus.nom}" target="_blank">
              Accéder
              <span class="fr-icon-arrow-right-line fr-ml-1w" aria-hidden="true"></span>
            </a>
          </div>
        </div>
      </div>
    `;
    cardsContainer.insertAdjacentHTML('beforeend', cardHTML);
  });
}

document.addEventListener('DOMContentLoaded', loadCorpora);
