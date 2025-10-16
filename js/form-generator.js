/**
 * Générateur de formulaire dynamiqu        select.id = field.id;
        select.name = field.name;

        if (field.placeholder) {
            const defaultOption = document.createElement('option');
            defaultOption.value = '';
            defaultOption.disabled = true;
            defaultOption.textContent = field.placeholder;
            if (!field.default) {une configuration JSON
 */
class FormGenerator {
    constructor(configPath) {
        this.configPath = configPath;
        this.config = null;
    }

    /**
     * Charge la configuration depuis le fichier JSON
     */
    async loadConfig() {
        try {
            const timestamp = new Date().getTime();
            const response = await fetch(`${this.configPath}?v=${timestamp}`);
            if (!response.ok) {
                throw new Error(`Erreur lors du chargement de la configuration: ${response.status}`);
            }
            this.config = await response.json();
        } catch (error) {
            console.error('Erreur lors du chargement de la configuration du formulaire:', error);
            throw error;
        }
    }

    /**
     * Génère un champ select
     */
    generateSelectField(field) {
        const selectGroup = document.createElement('div');
        selectGroup.className = 'fr-select-group';

        const label = document.createElement('label');
        label.className = 'fr-label';
        label.setAttribute('for', field.id);
        label.textContent = field.label;

        const select = document.createElement('select');
        select.className = 'fr-select';
        select.id = field.id;
        select.name = field.name;

        // Option par défaut
        if (field.placeholder) {
            const defaultOption = document.createElement('option');
            defaultOption.value = '';
            defaultOption.disabled = true;
            defaultOption.textContent = field.placeholder;
            if (!field.defaultValue) {
                defaultOption.selected = true;
            }
            select.appendChild(defaultOption);
        }

        field.options.forEach(option => {
            const optionElement = document.createElement('option');
            optionElement.value = option.value;
            
            if (option.available === false) {
                optionElement.textContent = `${option.label} (bientôt disponible)`;
                optionElement.disabled = true;
                optionElement.style.color = '#999';
                optionElement.style.fontStyle = 'italic';
            } else {
                optionElement.textContent = option.label;
            }
            
            if (field.defaultValue && option.value === field.defaultValue && option.available !== false) {
                optionElement.selected = true;
            }
            
            if (option.description) {
                if (option.available === false) {
                    optionElement.title = `${option.description} (Non disponible actuellement)`;
                } else {
                    optionElement.title = option.description;
                }
            }
            
            select.appendChild(optionElement);
        });

        selectGroup.appendChild(label);
        selectGroup.appendChild(select);

        // Ajouter un message d'information si le champ contient des options non disponibles
        const hasUnavailableOptions = field.options.some(option => option.available === false);
        if (hasUnavailableOptions) {
            const infoMessage = document.createElement('div');
            infoMessage.className = 'form-field-unavailable-notice';
            infoMessage.textContent = 'Certaines options sont en cours de développement.';
            selectGroup.appendChild(infoMessage);
        }

        return selectGroup;
    }

    /**
     * Génère un champ checkbox
     */
    generateCheckboxField(field) {
        const checkboxGroup = document.createElement('div');
        checkboxGroup.className = 'fr-checkbox-group';

        const input = document.createElement('input');
        input.type = 'checkbox';
        input.id = field.id;
        input.name = field.name;

        // Valeur par défaut pour les checkboxes
        if (field.defaultValue) {
            input.checked = Boolean(field.defaultValue);
        }

        const label = document.createElement('label');
        label.className = 'fr-label';
        label.setAttribute('for', field.id);
        label.textContent = field.label;

        if (field.hint) {
            const hint = document.createElement('span');
            hint.className = 'fr-hint-text';
            hint.textContent = field.hint;
            label.appendChild(document.createElement('br'));
            label.appendChild(hint);
        }

        checkboxGroup.appendChild(input);
        checkboxGroup.appendChild(label);

        return checkboxGroup;
    }

    /**
     * Génère un champ input (text, number, etc.)
     */
    generateInputField(field) {
        const inputGroup = document.createElement('div');
        inputGroup.className = 'fr-input-group';

        const label = document.createElement('label');
        label.className = 'fr-label';
        label.setAttribute('for', field.id);
        label.textContent = field.label;

        const input = document.createElement('input');
        input.id = field.id;
        input.className = 'fr-input';
        input.type = field.type;
        input.name = field.name;
        
        if (field.placeholder) {
            input.placeholder = field.placeholder;
        }

        if (field.required) {
            input.required = true;
        }

        // Attributs spécifiques aux champs numériques
        if (field.type === 'number') {
            if (field.min !== undefined) input.min = field.min;
            if (field.max !== undefined) input.max = field.max;
            if (field.step !== undefined) input.step = field.step;
        }

        // Valeur par défaut
        if (field.defaultValue !== undefined) {
            input.value = field.defaultValue;
        }

        inputGroup.appendChild(label);
        inputGroup.appendChild(input);

        if (field.hint) {
            const hint = document.createElement('span');
            hint.className = 'fr-hint-text';
            hint.textContent = field.hint;
            inputGroup.appendChild(hint);
        }

        return inputGroup;
    }

    /**
     * Génère le bouton de soumission
     */
    generateSubmitButton() {
        const button = document.createElement('button');
        button.className = this.config.submitButton.classes;
        button.type = 'submit';
        button.textContent = this.config.submitButton.text;
        return button;
    }

    /**
     * Génère le formulaire complet
     */
    generateForm(containerId) {
        if (!this.config) {
            throw new Error('Configuration non chargée. Appelez loadConfig() d\'abord.');
        }

        const container = document.getElementById(containerId);
        if (!container) {
            throw new Error(`Conteneur avec l'ID "${containerId}" introuvable.`);
        }

        // Créer le formulaire
        const form = document.createElement('form');
        form.id = 'settings-form';

        // Générer les champs
        this.config.fields.forEach(field => {
            let fieldElement;

            switch (field.type) {
                case 'select':
                    fieldElement = this.generateSelectField(field);
                    break;
                case 'checkbox':
                    fieldElement = this.generateCheckboxField(field);
                    break;
                case 'text':
                case 'number':
                case 'email':
                case 'password':
                    fieldElement = this.generateInputField(field);
                    break;
                default:
                    console.warn(`Type de champ non supporté: ${field.type}`);
                    return;
            }

            form.appendChild(fieldElement);
        });

        // Ajouter le bouton de soumission
        form.appendChild(this.generateSubmitButton());

        // Remplacer le contenu du conteneur
        container.innerHTML = '';
        container.appendChild(form);

        return form;
    }

    /**
     * Récupère les valeurs du formulaire
     */
    getFormData(formId = 'settings-form') {
        const form = document.getElementById(formId);
        if (!form) {
            throw new Error(`Formulaire avec l'ID "${formId}" introuvable.`);
        }

        const formData = new FormData(form);
        const data = {};

        // Traiter les champs normaux
        for (const [key, value] of formData.entries()) {
            data[key] = value;
        }

        // Traiter les checkboxes (non cochées ne sont pas dans FormData)
        this.config.fields.forEach(field => {
            if (field.type === 'checkbox') {
                const checkbox = document.getElementById(field.id);
                data[field.name] = checkbox ? checkbox.checked : false;
            }
        });

        return data;
    }

    /**
     * Remplit le formulaire avec des données
     */
    populateForm(data, formId = 'settings-form') {
        this.config.fields.forEach(field => {
            const element = document.getElementById(field.id);
            if (!element) return;

            const value = data[field.name];
            if (value === undefined) return;

            switch (field.type) {
                case 'checkbox':
                    element.checked = Boolean(value);
                    break;
                case 'select':
                case 'text':
                case 'number':
                case 'email':
                case 'password':
                    element.value = value;
                    break;
            }
        });
    }

    /**
     * Ajoute un gestionnaire d'événement pour la soumission du formulaire
     */
    onSubmit(callback, formId = 'settings-form') {
        const form = document.getElementById(formId);
        if (!form) {
            throw new Error(`Formulaire avec l'ID "${formId}" introuvable.`);
        }

        form.addEventListener('submit', (event) => {
            event.preventDefault();
            const data = this.getFormData(formId);
            callback(data, event);
        });
    }
}

// Export pour utilisation
window.FormGenerator = FormGenerator;
