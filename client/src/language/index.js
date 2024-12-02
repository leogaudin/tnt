import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

export const languages = [
	{ label: 'English', code: 'en' },
	{ label: 'Français', code: 'fr' },
];

i18n
	.use(initReactI18next)
	.init({
		lng: 'en',
		fallbackLng: 'en',
		interpolation: {
			escapeValue: false,
		},
		resources: {
			en: {
				translation: {
					username: 'Username',
					password: 'Password',
					welcomeBack: 'Welcome back!',
					login: 'Login',
					createNewAccount: 'Create a new account',
					continue: 'Continue',
					authError: 'Error during authentication',
					goBack: 'Go back',
					boxesLoading: 'Loading boxes...',
					home: 'Home',
					loggedInAs: 'Logged in as',
					logout: 'Logout',
					boxes: 'Boxes',
					yes: 'Yes',
					no: 'No',
					elementsPerPage: 'Elements per page',
					noScans: 'No scans',
					inProgress: 'In progress',
					reachedGps: 'Reached GPS',
					received: 'Received',
					validated: 'Validated',
					currently: 'Currently',
					reachedOrReceived: 'Reached GPS or Received',
					reachedAndReceived: 'Reached GPS and Received',
					in: 'in',
					kmAway: '{{count}} km away',
					secondsAgo_one: '{{count}} second ago',
					secondsAgo_other: '{{count}} seconds ago',
					minutesAgo_one: '{{count}} minute ago',
					minutesAgo_other: '{{count}} minutes ago',
					hoursAgo_one: '{{count}} hour ago',
					hoursAgo_other: '{{count}} hours ago',
					daysAgo_one: '{{count}} day ago',
					daysAgo_other: '{{count}} days ago',
					weeksAgo_one: '{{count}} week ago',
					weeksAgo_other: '{{count}} weeks ago',
					monthsAgo_one: '{{count}} month ago',
					monthsAgo_other: '{{count}} months ago',
					yearsAgo_one: '{{count}} year ago',
					yearsAgo_other: '{{count}} years ago',
					justNow: 'Just now',
					future: 'In the future',
					yesterday: 'Yesterday',
					tomorrow: 'Tomorrow',
					lastWeek: 'Last week',
					nextWeek: 'Next week',
					lastMonth: 'Last month',
					nextMonth: 'Next month',
					lastYear: 'Last year',
					nextYear: 'Next year',
					recipient: 'Recipient',
					project: 'Project',
					division: 'Division',
					district: 'District',
					zone: 'Zone',
					school: 'School',
					schoolCode: 'School Code',
					htName: 'HT Name',
					htPhone: 'HT Phone',
					createdAt: 'Created At',
					institutionType: 'Institution Type',
					scans: 'Scans',
					import: 'Import',
					export: 'Export',
					lastSeen: 'Last seen',
					uploadPrompt: 'Upload a distribution list',
					upload: 'Upload',
					addBoxes: 'Add boxes',
					columnOrder: 'Column order',
					nothingToSee: 'Nothing to see here',
					nothingToSeePrompt: 'Go to the Import page',
					updateGPS: 'Update GPS',
					updateGPSPrompt: 'Update the GPS coordinates of the boxes',
					any: 'Any',
					progress: 'Progress',
					filters: 'Filters',
					select: 'Select {{option}}',
					itemsSelected: '{{count}} items selected',
					printableLabels: 'Printable labels',
					printableLabelsDetail: 'Downloads the box labels with QR codes, in order to be printed',
					currentDeliveryReport: 'Current delivery report',
					currentDeliveryReportDetail: 'Downloads a report with every box as an entry, including important scans metadata',
					cancel: 'Cancel',
					confirm: 'Confirm',
					confirmAction: 'Confirm action',
					delete: 'Delete',
					deletePrompt: 'Are you sure you want to delete the selected boxes?',
					advanced: 'Advanced',
					about: 'About',
					insights: 'Insights',
					yourInsightsAreCurrently: 'Your insights are currently',
					public: 'public',
					private: 'private',
					make: 'Make',
					copied: 'Copied!',
					accessLink: 'Access link',
					total: 'Total',
					schoolLatitude: 'School Latitude',
					schoolLongitude: 'School Longitude',
					lastScanLatitude: 'Last Scan Latitude',
					lastScanLongitude: 'Last Scan Longitude',
					lastScanDistanceInMeters: 'Last Scan Distance in Meters',
					lastScanDate: 'Last Scan Date',
					reachedDate: 'Reached Date',
					receivedDistanceInMeters: 'Received Distance in Meters',
					receivedDate: 'Received Date',
					validatedDate: 'Validated Date',
					latitude: 'Latitude',
					longitude: 'Longitude',
					customSearch: 'Custom search',
					content: 'Content',
					contentPrompt: 'Every column after latitude and longitude will be treated as content. The headers will be used as keys, make sure they are correct and unique. For example, if you have a column named "Mathematics", the content will be stored as { "Mathematics": number }.',
					openRecipient: 'Open recipient details',
					insightsLoading: 'Loading insights...',
					loading: 'Loading',
					generatingPdf: 'Generating PDF...',
				},
			},
			fr: {
				translation: {
					username: 'Nom d\'utilisateur',
					password: 'Mot de passe',
					welcomeBack: 'Bienvenue!',
					login: 'Connexion',
					createNewAccount: 'Créer un nouveau compte',
					continue: 'Continuer',
					authError: 'Erreur lors de l\'authentification',
					goBack: 'Retour',
					boxesLoading: 'Chargement des boîtes...',
					home: 'Accueil',
					loggedInAs: 'Connecté en tant que',
					logout: 'Déconnexion',
					boxes: 'Boîtes',
					yes: 'Oui',
					no: 'Non',
					elementsPerPage: 'Éléments par page',
					noScans: 'Pas de scans',
					inProgress: 'En cours',
					reachedGps: 'GPS atteint',
					received: 'Reçu',
					validated: 'Validé',
					currently: 'Actuellement',
					reachedOrReceived: 'GPS atteint ou reçu',
					reachedAndReceived: 'GPS atteint et reçu',
					in: 'dans',
					kmAway: '{{count}} km de distance',
					secondsAgo_one: 'Il y a {{count}} seconde',
					secondsAgo_other: 'Il y a {{count}} secondes',
					minutesAgo_one: 'Il y a {{count}} minute',
					minutesAgo_other: 'Il y a {{count}} minutes',
					hoursAgo_one: 'Il y a {{count}} heure',
					hoursAgo_other: 'Il y a {{count}} heures',
					daysAgo_one: 'Il y a {{count}} jour',
					daysAgo_other: 'Il y a {{count}} jours',
					weeksAgo_one: 'Il y a {{count}} semaine',
					weeksAgo_other: 'Il y a {{count}} semaines',
					monthsAgo_one: 'Il y a {{count}} mois',
					monthsAgo_other: 'Il y a {{count}} mois',
					yearsAgo_one: 'Il y a {{count}} an',
					yearsAgo_other: 'Il y a {{count}} ans',
					justNow: 'À l\'instant',
					future: 'Dans le futur',
					yesterday: 'Hier',
					tomorrow: 'Demain',
					lastWeek: 'La semaine dernière',
					nextWeek: 'La semaine prochaine',
					lastMonth: 'Le mois dernier',
					nextMonth: 'Le mois prochain',
					lastYear: 'L\'année dernière',
					nextYear: 'L\'année prochaine',
					recipient: 'Destinataire',
					project: 'Projet',
					division: 'Division',
					district: 'District',
					zone: 'Zone',
					school: 'École',
					schoolCode: 'Code de l\'école',
					htName: 'Nom du directeur',
					htPhone: 'Téléphone du directeur',
					createdAt: 'Créé le',
					institutionType: 'Type d\'institution',
					scans: 'Scans',
					import: 'Importer',
					export: 'Exporter',
					lastSeen: 'Vu pour la dernière fois',
					uploadPrompt: 'Uploader une liste de distribution',
					upload: 'Upload',
					addBoxes: 'Ajouter des boîtes',
					columnOrder: 'Ordre des colonnes',
					nothingToSee: 'Rien à voir ici',
					nothingToSeePrompt: 'Allez à la page Importer',
					updateGPS: 'Mettre à jour les coordonnées GPS',
					updateGPSPrompt: 'Mettre à jour les coordonnées GPS des boîtes',
					any: 'Tous',
					progress: 'Progression',
					filters: 'Filtres',
					select: 'Sélectionnez {{option}}',
					itemsSelected: '{{count}} éléments sélectionnés',
					printableLabels: 'Étiquettes imprimables',
					printableLabelsDetail: 'Télécharger les étiquettes avec QR codes pour l\'impression',
					currentDeliveryReport: 'Rapport de livraison actuel',
					currentDeliveryReportDetail: 'Télécharger un rapport avec chaque boîte en entrée, incluant les métadonnées de scans importantes',
					cancel: 'Annuler',
					confirm: 'Confirmer',
					confirmAction: 'Confirmer l\'action',
					delete: 'Supprimer',
					deletePrompt: 'Êtes-vous sûr de vouloir supprimer les boîtes sélectionnées ?',
					advanced: 'Avancé',
					about: 'À propos',
					insights: 'Statistiques',
					yourInsightsAreCurrently: 'Vos statistiques sont actuellement',
					public: 'publiques',
					private: 'privées',
					make: 'Rendre',
					copied: 'Copié !',
					accessLink: 'Lien d\'accès',
					total: 'Total',
					schoolLatitude: 'Latitude de l\'école',
					schoolLongitude: 'Longitude de l\'école',
					lastScanLatitude: 'Latitude du dernier scan',
					lastScanLongitude: 'Longitude du dernier scan',
					lastScanDistanceInMeters: 'Distance du dernier scan en mètres',
					lastScanDate: 'Date du dernier scan',
					reachedDate: 'Date du scan GPS Atteint',
					receivedDistanceInMeters: 'Distance du scan Reçu en mètres',
					receivedDate: 'Date du scan Reçu',
					validatedDate: 'Date du scan Validé',
					latitude: 'Latitude',
					longitude: 'Longitude',
					customSearch: 'Recherche personnalisée',
					content: 'Contenu',
					contentPrompt: 'Chaque colonne après latitude et longitude sera considérée comme du contenu. Les en-têtes seront utilisés comme clés, assurez-vous qu\'ils sont corrects et uniques. Par exemple, si vous avez une colonne nommée "Mathématiques", le contenu sera stocké { "Mathématiques": nombre }.',
					openRecipient: 'Ouvrir la fiche destinataire',
					insightsLoading: 'Chargement des statistiques...',
					loading: 'Chargement',
					generatingPdf: 'Génération du PDF...',
				},
			},
		},
	});

export default i18n;
