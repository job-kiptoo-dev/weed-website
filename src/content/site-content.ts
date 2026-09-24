/**
 * Site copy, kept as typed config in code (developer-edited and reviewed).
 * Pages read it through `contentService`, never directly.
 * All copy is sentence case, plain, and makes no health or medical claims.
 */
import { siteConfig, type FeatureFlags } from "@/lib/site-config";
import type {
  FaqItem,
  HomeContent,
  StaticPage,
  StaticPageSection,
} from "@/types/content";

const { name, contact } = siteConfig;

const baseFaqItems: FaqItem[] = [
  {
    id: "faq-shipping",
    question: "How long does shipping take?",
    answer:
      "Orders ship in 1 to 2 business days from Portland, Oregon. Standard shipping takes 3 to 5 business days within the US. Orders over $75 ship free; otherwise shipping is a flat $6.95.",
  },
  {
    id: "faq-returns",
    question: "What is your return policy?",
    answer:
      "You can return unopened products within 30 days of delivery for a full refund. Email us with your order number and we will send a prepaid label. Opened products can be returned for store credit.",
  },
  {
    id: "faq-lab-reports",
    question: "Can I see the lab report for my product?",
    answer:
      "Yes. Every batch is tested by an independent lab. The batch number is printed on the label, and you can email us with it to receive the full certificate of analysis for that batch.",
  },
  {
    id: "faq-strength",
    question: "How do I read the strength on the label?",
    answer:
      "Products that come in pieces, like gummies, chocolate squares, honey straws, tea sachets, cocoa packets and softgels, list the amount of CBD in each piece. Everything else, like tinctures, balms, lotions, bath soaks and matcha, lists the total amount in the package. Every label also lists the amount in each serving. For example, a 1000 mg, 30 mL tincture has about 33 mg in each 1 mL serving.",
  },
  {
    id: "faq-serving",
    question: "How much should I take?",
    answer:
      "We cannot give individual guidance. Most people start small and see how it fits their routine, then adjust. Every label lists the serving size we used to calculate the amount per serving.",
  },
  {
    id: "faq-spectrum",
    question: "What do full spectrum, broad spectrum and isolate mean?",
    answer:
      "They describe how much of the hemp plant is kept in the extract. Full spectrum keeps the widest range of plant compounds and has the strongest hemp taste. Broad spectrum keeps most of them with some removed. Isolate is CBD only, with no hemp taste.",
  },
  {
    id: "faq-storage",
    question: "How should I store my products?",
    answer:
      "Keep tinctures, gummies and softgels in a cool, dark place with the cap or seal closed. Chocolate and gummies can go in the fridge in warm weather. Most products keep for 12 months from the date on the label.",
  },
  {
    id: "faq-age",
    question: "Is there an age requirement?",
    answer: `Yes. You must be 21 or over to order from ${name}. We may ask for proof of age before shipping an order.`,
  },
];

const smokableHempFaq: FaqItem = {
  id: "faq-smokable-hemp",
  question: "Can you ship hemp flower and pre-rolls to my state?",
  answer:
    "Some states restrict or ban smokable hemp. We confirm your address before these products ship and refund any order we can't send.",
};

/** FAQ items shown on the product detail page. */
export const productFaqIds: string[] = [
  "faq-strength",
  "faq-lab-reports",
  "faq-returns",
];

const baseHomeContent: Omit<HomeContent, "categoryRowSlugs"> = {
  promoBanner: {
    title: "Cool mint isolate is on sale",
    subtitle:
      "CBD isolate in MCT oil with a clean peppermint taste and no hemp flavor. A 30 mL amber bottle with a graduated dropper.",
    productSlug: "mint-isolate-tincture",
    ctaLabel: "Shop cool mint isolate",
    imageUrl: "/images/promo/mint-tincture.jpg",
    imageAlt:
      "Two small corked glass vials of clear oil, one holding a green herb sprig, on burlap beside pink and purple wildflowers",
  },
  bands: [
    {
      id: "band-lab",
      title: "Tested by an independent lab, every batch",
      paragraphs: [
        "Each batch we make is tested by an independent lab before it ships. The batch number is printed on every label, and you can request the full certificate of analysis for your product at any time.",
        "Strength, spectrum and ingredients are printed on the front of every label, so you know exactly what you're buying.",
      ],
      imageUrl: "/images/bands/lab-glassware.jpg",
      imageAlt:
        "Glass test tubes in a metal rack, some holding coloured liquids, beside laboratory flasks",
      cta: { label: "Read the FAQ", href: "/faq" },
    },
    {
      id: "band-small-batch",
      title: "Made in small batches in Portland",
      paragraphs: [
        "We make tinctures, gummies, topicals and teas in small batches, and we still print the batch number on every label.",
        "All of our hemp is grown on licensed farms in Oregon and Colorado. We work with the same growers each season and visit the farms every year.",
      ],
      imageUrl: "/images/bands/small-batch.jpg",
      imageAlt: "Young hemp plants with green fan leaves",
      cta: { label: "Read our story", href: "/about" },
    },
  ],
  trustFeatures: [
    {
      id: "trust-lab",
      title: "Third-party lab tested",
      description:
        "Every batch is tested by an independent lab and the report is available on request.",
      icon: "shield",
    },
    {
      id: "trust-shipping",
      title: "Free shipping over $75",
      description:
        "Orders over $75 ship free. Everything else ships for a flat $6.95.",
      icon: "truck",
    },
    {
      id: "trust-returns",
      title: "30-day returns",
      description: "Return unopened products within 30 days for a full refund.",
      icon: "refresh",
    },
    {
      id: "trust-hemp",
      title: "US-grown hemp",
      description: "All of our hemp is grown on farms in Oregon and Colorado.",
      icon: "leaf",
    },
  ],
};

const baseStaticPages: StaticPage[] = [
  {
    slug: "about",
    title: `About ${name}`,
    intro:
      "We make a small range of hemp-derived CBD products in Portland, Oregon, and we try to describe them as plainly as we can.",
    sections: [
      {
        heading: "How we started",
        paragraphs: [
          `${name} started in 2023 with two tinctures and a folding table at a weekend market. The idea was simple: make a short list of products, label them clearly, and publish the lab results.`,
          "Today we make tinctures, gummies, topicals and teas in small batches, and we still print the batch number on every label.",
        ],
      },
      {
        heading: "Where our hemp comes from",
        paragraphs: [
          "All of our hemp is grown on licensed farms in Oregon and Colorado. We work with the same growers each season and visit the farms every year.",
          "The extract is made in a licensed facility in Oregon, and every batch is tested by an independent lab before we bottle it.",
        ],
      },
      {
        heading: "What we do not do",
        paragraphs: [
          "We do not make claims about what our products will do for you. We describe what is in them, how they taste, and how they are packaged, and we leave the rest to you.",
        ],
      },
    ],
  },
  {
    slug: "privacy",
    title: "Privacy policy",
    intro:
      "This page explains what information we collect when you use our site and how we use it.",
    sections: [
      {
        heading: "What we collect at checkout",
        paragraphs: [
          "When you place an order we collect your name, your billing address and delivery address, your phone number, your email address, and what you ordered. Company name and order notes are optional, and anything you type into them is stored with the order too.",
          "We need these to price the order, get it to you or hand it over at pickup, and reach you to arrange payment. The phone number and email are how we contact you about that order.",
          "If you sign up for our newsletter, or tick the marketing box at checkout, we store your email address until you unsubscribe.",
        ],
      },
      {
        heading: "Payment details",
        paragraphs: [
          "We never collect card numbers, CVV codes, bank logins or wallet credentials on this site. There is no card form anywhere on it, and no payment is taken when you place an order.",
          "Whichever payment method you choose at checkout, a person contacts you afterwards to arrange payment. Nothing you tell us then is stored on the site.",
        ],
      },
      {
        heading: "How we use it and who sees it",
        paragraphs: [
          "We use your information to price and fulfil orders, arrange payment, answer support requests, and send the newsletter if you asked for it. We do not sell your information to anyone, and we do not use it for advertising.",
          "Every new order is emailed to the store owner's inbox, which is how we know to pack it and call you. The owner is the only person who reads your order details, apart from any delivery service we use to get the order to you.",
        ],
      },
      {
        heading: "How long we keep it",
        paragraphs: [
          "We keep order records, including the copy of the address as it was when you ordered, for 7 years. Tax and accounting rules require us to be able to show what we sold and to whom, so we cannot delete these earlier.",
          "Addresses saved to an account are deleted when the account is deleted. Newsletter sign-ups are removed when you unsubscribe.",
        ],
      },
      {
        heading: "Cookies",
        paragraphs: [
          "We use a small number of cookies to keep your cart and session working. We do not use advertising cookies.",
        ],
      },
      {
        heading: "Contact",
        paragraphs: [
          `To ask what we hold about you, or to have it deleted, email ${contact.email}. We delete what we are not required to keep, and tell you what we have to keep and for how long.`,
        ],
      },
    ],
  },
  {
    slug: "terms",
    title: "Terms of service",
    intro: `These terms apply when you use our website or place an order with ${name}.`,
    sections: [
      {
        heading: "Eligibility",
        paragraphs: [
          "You must be 21 or over to place an order. By ordering you confirm that you meet this requirement and that the products are legal to receive at your address.",
        ],
      },
      {
        heading: "Orders and payment",
        paragraphs: [
          "Prices are listed in US dollars and do not include sales tax, which is calculated at checkout. We may cancel an order if a product is out of stock or a price was listed in error, and we will refund you in full if we do.",
        ],
      },
      {
        heading: "Shipping and returns",
        paragraphs: [
          "Orders ship within 1 to 2 business days. Unopened products can be returned within 30 days of delivery for a full refund. See the FAQ for details.",
        ],
      },
      {
        heading: "Product information",
        paragraphs: [
          "Product descriptions and lab reports are provided for information only. Nothing on this site is medical advice.",
        ],
      },
    ],
  },
  {
    slug: "contact",
    title: "Contact us",
    intro:
      "Questions about an order, a lab report or a product? Send us a message and we will reply within one business day.",
    sections: [],
  },
];

const smokableHempTermsSection: StaticPageSection = {
  heading: "Smokable hemp",
  paragraphs: [
    "Hemp pre-rolls and hemp flower are restricted or banned in some states. We check the shipping address on every order that includes them, and we cancel and refund in full any order we can't legally send.",
    "You are responsible for knowing the rules where the order is delivered. We may stop selling these products in a state at any time as the rules change.",
  ],
};

function insertBefore(
  items: FaqItem[],
  beforeId: string,
  item: FaqItem,
): FaqItem[] {
  const index = items.findIndex((faq) => faq.id === beforeId);
  if (index === -1) return [...items, item];
  return [...items.slice(0, index), item, ...items.slice(index)];
}

function insertAfterHeading(
  sections: StaticPageSection[],
  heading: string,
  section: StaticPageSection,
): StaticPageSection[] {
  const index = sections.findIndex((s) => s.heading === heading);
  if (index === -1) return [...sections, section];
  return [
    ...sections.slice(0, index + 1),
    section,
    ...sections.slice(index + 1),
  ];
}

export interface SiteContent {
  faqItems: FaqItem[];
  homeContent: HomeContent;
  staticPages: StaticPage[];
}

/**
 * Builds site copy for a set of feature flags. Pure: tests pass flags in
 * directly instead of changing `siteConfig`.
 */
export function buildContent(features: FeatureFlags): SiteContent {
  const smokable = features.smokableHemp;
  return {
    faqItems: smokable
      ? insertBefore(baseFaqItems, "faq-age", smokableHempFaq)
      : baseFaqItems,
    homeContent: {
      ...baseHomeContent,
      categoryRowSlugs: smokable
        ? ["hemp-flower", "tinctures", "gummies-edibles"]
        : ["tinctures", "gummies-edibles", "topicals"],
    },
    staticPages: smokable
      ? baseStaticPages.map((page) =>
          page.slug === "terms"
            ? {
                ...page,
                sections: insertAfterHeading(
                  page.sections,
                  "Shipping and returns",
                  smokableHempTermsSection,
                ),
              }
            : page,
        )
      : baseStaticPages,
  };
}

/** Site copy for the current `siteConfig.features`. */
export function getSiteContent(): SiteContent {
  return buildContent(siteConfig.features);
}
