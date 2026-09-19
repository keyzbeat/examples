export const company = {
  name: "Driv'in La e-Concession",
  shortName: "Driv'in Bordeaux",
  tagline: "Voitures d'occasion premium, luxe et sport à Bordeaux",
  description:
    "Vente de voitures d'occasion premium, luxe et sport à Bordeaux et en Gironde. Une équipe de professionnels passionnés, une recherche personnalisée de véhicules atypiques, un réseau national et des partenaires européens.",
  address: {
    street: "5 Rue des Métiers",
    zone: "Z.A. du Cournalet",
    postalCode: "33290",
    city: "Blanquefort",
    country: "France",
  },
  hours: [
    { days: "Lundi – Vendredi", hours: "9h00 – 12h00 / 14h00 – 19h00" },
    { days: "Samedi", hours: "Sur rendez-vous" },
    { days: "Dimanche", hours: "Fermé" },
  ],
  // [DÉMO] coordonnées neutres, non cliquables / sans action réelle — voir TODO-DEMO.md
  contact: {
    phoneDisplay: "05 00 00 00 00",
    emailDisplay: "contact@exemple-demo.fr",
  },
  brandColor: "#f89303",
  services: [
    {
      title: "Recherche personnalisée",
      description:
        "Nous trouvons le véhicule atypique que vous recherchez, en France comme en Europe.",
    },
    {
      title: "Traçabilité du véhicule",
      description:
        "Historique et origine vérifiés avant chaque mise en vente.",
    },
    {
      title: "Service administratif",
      description: "Accompagnement dans toutes les démarches liées à l'achat.",
    },
    {
      title: "Personnalisation",
      description: "Covering et personnalisation esthétique sur mesure.",
    },
    {
      title: "Covering",
      description: "Habillage complet ou partiel selon vos envies.",
    },
    {
      title: "Protection micro-rayures",
      description: "Traitement de protection de la carrosserie.",
    },
    {
      title: "Nettoyage",
      description: "Préparation esthétique intérieure et extérieure.",
    },
    {
      title: "Transport de véhicules",
      description: "Livraison sécurisée partout en France et en Europe.",
    },
    {
      title: "Financement",
      description: "Solutions de financement adaptées à votre projet.",
    },
    {
      title: "Carte grise",
      description: "Prise en charge complète des démarches de carte grise.",
    },
  ],
  soldVehicles: [
    "Porsche 911 GT3 992 PDK",
    "BMW M2 Competition DKG7",
    "Maserati Levante GrandSport SQ4",
    "Mini GP édition limitée",
  ],
} as const;

export type CompanyHours = (typeof company.hours)[number];
