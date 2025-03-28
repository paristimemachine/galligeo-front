async function deposerSurNakala() {

    const apiKey = document.getElementById('nakala-api-key').value;
    const nom = document.getElementById('nom').value;
    const prenom = document.getElementById('prenom').value;
    const institution = document.getElementById('institution').value;
    const url = 'https://apitest.nakala.fr/datas';

    const data = {
        collectionsIds: ["10.34847/nkl.12345678"],
        files: [
            {
                name: "fichier.txt|null",
                sha1: "string",
                embargoed: "2025-03-27",
                description: "string"
            }
        ],
        relations: [
            {
                type: "Cites",
                repository: "hal",
                target: "hal-02464318v1",
                comment: "string"
            }
        ],
        status: "pending",
        metas: [
            {
                value: "string",
                lang: "string",
                typeUri: "string",
                propertyUri: "string"
            }
        ],
        rights: [
            {
                id: "33170cfe-f53c-550b-5fb6-4814ce981293",
                role: "ROLE_EDITOR"
            }
        ],
        nom: nom,
        prenom: prenom,
        institution: institution
    };
    
    if (!apiKey) {
        alert('Veuillez entrer une clé d\'API Nakala.');
        return;
    }

    if (!nom || !prenom || !institution) {
        alert('Veuillez remplir tous les champs : nom, prénom, institution.');
        return;
    }

    // const data = {
    //     title: 'Titre de l\'élément',
    //     description: 'Description de l\'élément',
    //     nom: nom,
    //     prenom: prenom,
    //     institution: institution
    //     // Ajouter d'autres champs nécessaires
    // };

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify(data)
        });

        if (!response.ok) {
            throw new Error(`Erreur: ${response.statusText}`);
        }

        const result = await response.json();
        alert('Dépôt réussi sur Nakala !');
        console.log(result);
    } catch (error) {
        console.error('Erreur lors du dépôt sur Nakala:', error);
        alert('Erreur lors du dépôt sur Nakala. Veuillez vérifier la console pour plus de détails.');
    }
}