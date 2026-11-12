// Site-wide facts and settings. Edit here; every page reads from this file.

export const SITE = {
  name: 'Australian Target Systems',
  short: 'ATS',
  url: 'https://www.atspl.com.au',
  tagline: "When you aim for perfection, you'll discover it's a moving target.",
  description:
    'Australian Target Systems designs, integrates and maintains live-fire range systems for the Australian Defence Force and ranges worldwide. Managing Contractor for the Integrated Land Target Systems (ILTS) program.',
  phone: '+61 2 6051 7000',
  phoneHref: 'tel:+61260517000',
  email: 'info@ats-t1.com',
  iltsEmail: 'iltsprogramoffice@ats-t1.com',
  address: ['837 Hope Court', 'Albury NSW 2640', 'Australia'],
  mapUrl: 'https://www.google.com/maps/search/?api=1&query=837+Hope+Court+Albury+NSW+2640',
};

export const NAV = [
  { href: '/', label: 'Home' },
  { href: '/about-us/', label: 'About' },
  { href: '/ilts/', label: 'ILTS' },
  { href: '/ranges/', label: 'Ranges' },
];

// Where forms are sent. Leave empty to open the visitor's email app with the
// message pre-filled; set to a form endpoint URL (Formspree, Netlify Forms,
// Fluent Forms REST, your own API) to post the form as multipart/form-data.
export const FORM_ENDPOINT = '';

// The two ILTS videos are large (156 MB and 89 MB), so they stay on the
// existing media host rather than being bundled with the site.
export const MEDIA = {
  iltsHeroVideo: 'https://atspl.com.au/wp-content/uploads/2026/09/ILTS_header-image_v3.mp4',
  kftaDemoVideo: 'https://atspl.com.au/wp-content/uploads/2026/10/KFTA-Demo-Video.mp4',
};

export const STATS = [
  { value: 10000, suffix: '+', label: 'Electro targets installed globally' },
  { value: 65, suffix: '+', label: 'Years of proven performance' },
  { value: 500, suffix: '+', label: 'Range projects worldwide' },
];
