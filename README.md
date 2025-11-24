# Workflow de GalleryHilarious

Ce document décrit le processus pour créer et gérer de nouvelles galeries de photos dans l'application The Wall Academy Gallery.

## 1. Création d'une nouvelle galerie

Pour ajouter une nouvelle galerie, vous devez d'abord créer une nouvelle entrée dans la base de données avec les informations suivantes :

- **title** : Le titre qui sera affiché pour la galerie.
- **password** : Un mot de passe unique pour protéger l'accès à la galerie.
- **photosPath** : Le nom du répertoire dans lequel les photos de cette galerie seront stockées. Ce nom doit être unique.
- **date** : La date de l'événement ou de la création de la galerie.

> [!CAUTION]
> Laisser les autres champs vides, ils se rempliront tous seuls. Les remplir pourrait dérégler voir empêcher le bon fonctionnement de l'application.

## 2. Stockage des photos

Les photos de chaque galerie doivent être téléversées via FTP.

- Tous les dossiers de galerie doivent être placés à l'intérieur d'un répertoire principal nommé `storage`.
- Le nom de chaque dossier à l'intérieur de `storage` doit correspondre exactement au **Nom du dossier** spécifié dans la base de données pour cette galerie.

### Exemple de structure de dossiers :

```
/storage/
    ├── mariage-jean-et-jeanne/
    │   ├── photo1.jpg
    │   ├── photo2.jpg
    │   └── ...
    └── fete-anniversaire-2025/
        ├── image_001.jpg
        ├── image_002.jpg
        └── ...
```

## 3. Internationalisation

Le texte affiché sur le site est disponible en plusieurs langues. Vous pouvez modifier les traductions pour chaque langue en éditant les fichiers JSON correspondants dans le dossier `messages/`.

- `messages/en.json` pour l'anglais.
- `messages/fr.json` pour le français.
- `messages/nl.json` pour le néerlandais.

Chaque fichier contient des paires clé-valeur. Pour changer un texte, il suffit de modifier la valeur associée à une clé sans toucher à la clé elle-même.

### Exemple de contenu de fichier JSON :

```json
{
  "HomePage": {
    "title": "Bienvenue dans la galerie",
    "subtitle": "Entrez le mot de passe pour voir les photos."
  },
  "GalleryPage": {
    "back_button": "Retour à l'accueil"
  }
}
```
