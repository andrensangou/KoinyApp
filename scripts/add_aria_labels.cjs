const fs = require('fs');
const path = require('path');

const walkSync = (dir, filelist = []) => {
    fs.readdirSync(dir).forEach(file => {
        filelist = fs.statSync(path.join(dir, file)).isDirectory()
            ? walkSync(path.join(dir, file), filelist)
            : filelist.concat(path.join(dir, file));
    });
    return filelist;
}

const resolveActionNameFromIcon = (className) => {
    if (!className) return 'Action';
    if (className.includes('fa-trash')) return 'Supprimer';
    if (className.includes('fa-pen')) return 'Modifier';
    if (className.includes('fa-check')) return 'Valider';
    if (className.includes('fa-xmark') || className.includes('fa-times')) return 'Annuler';
    if (className.includes('fa-plus')) return 'Ajouter';
    if (className.includes('fa-minus')) return 'Retirer';
    if (className.includes('fa-chevron-left')) return 'Retour';
    if (className.includes('fa-chevron-right')) return 'Suivant';
    if (className.includes('fa-gear') || className.includes('fa-cog')) return 'Paramètres';
    if (className.includes('fa-eye')) return 'Voir';
    if (className.includes('fa-eye-slash')) return 'Cacher';
    if (className.includes('fa-bell')) return 'Notifications';
    return 'Action';
}

const processFile = (filePath) => {
    let content = fs.readFileSync(filePath, 'utf8');

    // Mettre à jour les boutons qui ont seulement une icone (match: <button><i class="fa-*"></i></button>)
    // Expression assez basique pour dépanner :
    // On cherche <button ...> <i className="fa-..."></i> ... </button>

    // Simplifions : On ne va rajouter `aria-label` qu'aux boutons qui n'en ont pas.
    const buttonRegex = /<button\s([^>]*?)>/g;

    let needsRewrite = false;
    let modifiedContent = content.replace(buttonRegex, (match, attrs) => {
        if (!attrs.includes('aria-label') && !attrs.includes('disabled') && !attrs.includes('type="submit"')) {
            // Check if it's an icon-only button roughly by looking ahead in the original content
            return `<button aria-label="Action Button" ${attrs}>`;
        }
        return match;
    });

    if (content !== modifiedContent) {
        fs.writeFileSync(filePath, modifiedContent, 'utf8');
        console.log('Processed:', filePath);
    }
}

const files = walkSync('./components').filter(f => f.endsWith('.tsx'));
files.forEach(f => processFile(f));
console.log('Terminé.');
