import { type LinkListItem } from "@/components/LinkList";
import { type PanelSection } from "@/components/ControlPanel";
import { type HoverCardMedia } from "@/lib/hover-card-bus";

/* ── Default content ── */

export const DEFAULTS = {
  greeting: "Hey, I'm Prithvi.",
  bio: "I've been building things on the internet since I was 13. Games first. Then AI. Then companies around both. I moved from Bangalore to SF to keep doing it.",
  genz: `cto @ applied reality, building world models for 3d games + robotics. built roam (text → 3d multiplayer games). shipped 100+ games solo for voodoo and supersonic - they thought i was a studio. won buildspace out of 30k people. moved bangalore → sf. google check at 13. hacked farmville. sold hoodies to my whole school. play csgo and dota 2 (1v1 me bro).`,
};

export type Content = typeof DEFAULTS;

/* ── Lists data ── */

const LOGO = (name: string) => `/logos/${name}_favicon.png`;
const SHOT = (name: string) => `/screenshots/${name}.png`;

export const PREVIOUSLY: LinkListItem[] = [
  {
    title: "Previously, I was the CTO of Applied Reality, an applied AI lab in SF building generative world models for games + robotics ($4.5m raised)",
    brandLinks: [
      {
        name: "Applied Reality",
        href: "https://areality.co",
        favicon: LOGO("areality"),
        media: {
          type: "image",
          src: SHOT("areality"),
          caption: "areality.co - human-AI world creation",
        },
      },
    ],
  },
  {
    title: "Built Roam, an AI consumer app that lets you go from a text prompt to a 3D multiplayer game in minutes → roam.gg",
    brandLinks: [
      {
        name: "Roam",
        href: "https://roam.lol",
        favicon: LOGO("roam"),
        media: {
          type: "image",
          src: SHOT("roam"),
          caption: "roam.lol",
        },
      },
    ],
    inlineLinks: [
      {
        phrase: "roam.gg",
        href: "https://roam.gg",
        media: {
          type: "image",
          src: SHOT("roam-gg"),
          caption: "roam.gg - turn anything into a game",
        },
      },
    ],
  },
  {
    title: "Solo-bootstrapped a game studio and shipped 100+ titles with Voodoo and Supersonic - 200K+ downloads and six figures in revenue",
    inlineLinks: [
      {
        phrase: "game studio",
        href: "https://www.skive.in",
        media: {
          type: "image",
          src: SHOT("skive"),
          caption: "skive.in",
        },
      },
    ],
    brandLinks: [
      {
        name: "Voodoo",
        href: "https://www.voodoo.io",
        favicon: LOGO("voodoo"),
        media: {
          type: "image",
          src: SHOT("voodoo"),
          caption: "voodoo.io",
        },
      },
      {
        name: "Supersonic",
        href: "https://www.supersonic.com",
        favicon: LOGO("supersonic"),
        media: {
          type: "image",
          src: SHOT("supersonic"),
          caption: "supersonic.com",
        },
      },
    ],
  },
];

// Project titles are always links; unreleased ones point here for now.
const DEFAULT_PROJECT_URL = "https://github.com/prithvi-bharadwaj";

export const PROJECTS: LinkListItem[] = [
  {
    title: "voxel demolish - generative AI playcast that won the Google DeepMind × Stanford AI Game Contest",
    inlineLinks: [
      {
        phrase: "voxel demolish",
        href: "https://youtube.com/shorts/E4fyqr_semE",
        media: { type: "youtube", id: "E4fyqr_semE", caption: "voxel demolish" },
      },
    ],
  },
  {
    title: "Focused - an open-source AI extension that organizes and searches your browser tabs",
    inlineLinks: [{ phrase: "Focused", href: DEFAULT_PROJECT_URL }],
  },
  {
    title: "Reflink - use your clipboard in Wispr Flow without stopping to talk",
    inlineLinks: [
      {
        phrase: "Reflink",
        href: "https://github.com/prithvi-bharadwaj/wf-reflink-extension",
        media: { type: "image", src: SHOT("reflink"), caption: "github.com/prithvi-bharadwaj/wf-reflink-extension" },
      },
    ],
  },
  {
    title: "v2p - open-source tool that turns any video into ready-to-send prompts for your AI agents",
    inlineLinks: [{ phrase: "v2p", href: DEFAULT_PROJECT_URL }],
  },
  {
    title: "AI sandbox - image + video generation with templates",
    inlineLinks: [{ phrase: "AI sandbox", href: DEFAULT_PROJECT_URL }],
  },
  {
    title: "slack huddle mcp - reads huddle transcripts + AI summaries straight from Slack",
    inlineLinks: [{ phrase: "slack huddle mcp", href: DEFAULT_PROJECT_URL }],
  },
  {
    title: "skills - my collection of AI skills i use daily",
    inlineLinks: [{ phrase: "skills", href: DEFAULT_PROJECT_URL }],
  },
  {
    title: "mcps - my collection of MCPs i use daily",
    inlineLinks: [{ phrase: "mcps", href: DEFAULT_PROJECT_URL }],
  },
  {
    title: "+ 100s more in previous years",
  },
];

export const LORE: LinkListItem[] = [
  {
    title: "First cheque from Google at 13",
    expand: "For a YouTube video showing people how to hack passwords.",
    media: {
      type: "image",
      src: "/proof/youtube-password-video.png",
      wide: true,
      caption: "278,436 views before YouTube removed it",
    },
  },
  {
    title: "Hacked FarmVille for infinite resources; traded them for homework",
  },
  {
    title: "Started an e-commerce brand in high school; sold out the first merch drop to my entire batch",
    expand: "Almost got kicked out for it.",
  },
  {
    title: "Borrowed money as a teenager to build a monster PC; paid it back in weeks with a design agency I ran on it",
    expand: "Edits, launch videos, marketing content, and social ads for businesses on Instagram.",
  },
  {
    title: "Convinced Voodoo I was a five-person studio by teaching myself code, art, animation, game design, and music",
    brandLinks: [
      {
        name: "Voodoo",
        href: "https://www.voodoo.io",
        favicon: LOGO("voodoo"),
        media: {
          type: "image",
          src: SHOT("voodoo"),
          caption: "voodoo.io",
        },
      },
    ],
  },
  {
    title: "Built a MrBeast game in six weeks",
  },
  {
    title: "Won Buildspace's live game show",
    inlineLinks: [
      {
        phrase: "live game show",
        href: "https://x.com/FarzaTV/status/1719091708775059754",
        media: { type: "image", src: SHOT("gameshow"), caption: "x.com/FarzaTV - it's time for the next chapter" },
      },
      {
        phrase: "Buildspace",
        href: "https://buildspace.so/",
        media: { type: "image", src: SHOT("buildspace"), caption: "buildspace.so - hi. this was buildspace." },
      },
    ],
  },
  {
    title: "Competitive gamer, multiple-time local and regional tournament winner in Counter-Strike and Dota 2",
    brandLinks: [
      {
        name: "Counter-Strike",
        href: "https://store.steampowered.com/app/730/CounterStrike_2/",
        favicon: "/logos/csgo.svg",
        media: { type: "image", src: SHOT("csgo"), caption: "counter-strike 2" },
      },
      {
        name: "Dota 2",
        href: "https://store.steampowered.com/app/570/Dota_2/",
        favicon: "/logos/dota2.svg",
        media: { type: "image", src: SHOT("dota2"), caption: "dota 2" },
      },
    ],
  },
];

export const WRITING: LinkListItem[] = [
  { title: "the buildspace experience", meta: "jun 2024", href: "https://prithvibharadwaj.substack.com/p/the-buildspace-experience", favicon: LOGO("substack") },
  { title: "antigravity IDE for unity", meta: "may 2024", href: "https://medium.com/@prithvibofficial/how-to-use-antigravity-in-unity-for-game-development-8da2cbc353cb", favicon: "/logos/medium.svg" },
  { title: "how to use cursor AI with unity", meta: "feb 2024", href: "https://medium.com/@prithvibofficial/how-to-use-cursor-ai-with-unity-a32291f9e852", favicon: "/logos/medium.svg" },
  { title: "building & skiving", meta: "jan 2024", href: "https://prithvibharadwaj.substack.com/p/building-and-skiving", favicon: LOGO("substack") },
  { title: "looking back at 2023", meta: "jan 2024", href: "https://prithvibharadwaj.substack.com/p/looking-back-at-2023", favicon: LOGO("substack") },
  { title: "travel, timepass and being in the trenches", meta: "dec 2023", href: "https://prithvibharadwaj.substack.com/p/travel-timepass-and-being-in-the", favicon: LOGO("substack") },
  { title: "i might have overcorrected", meta: "nov 2023", href: "https://prithvibharadwaj.substack.com/p/i-might-have-overcorrected", favicon: LOGO("substack") },
  { title: "the philosophy behind \"asjbdhjasdfhgw\"", meta: "nov 2023", href: "https://prithvibharadwaj.substack.com/p/the-philosophy-behind-asjbdhjasdfhgw", favicon: LOGO("substack") },
];

// `contact: true` links are locked until the visitor earns SOCIAL_UNLOCK_XP -
// they have to get to know Prithvi before they can reach out.
export const SOCIALS: {
  label: string;
  href: string;
  favicon: string;
  contact?: boolean;
  media?: HoverCardMedia;
}[] = [
  {
    label: "Instagram",
    href: "https://instagram.com/theprithvibharadwaj",
    favicon: "/logos/instagram.svg",
    contact: true,
    media: { type: "image", src: SHOT("social-instagram"), caption: "@theprithvibharadwaj" },
  },
  {
    label: "LinkedIn",
    href: "https://www.linkedin.com/in/prithvibharadwaj/",
    favicon: "/logos/linkedin.svg",
    contact: true,
    media: { type: "image", src: SHOT("social-linkedin"), caption: "linkedin.com/in/prithvibharadwaj" },
  },
  {
    label: "Twitter",
    href: "https://x.com/PrithviBtw",
    favicon: LOGO("x"),
    contact: true,
    media: { type: "image", src: SHOT("social-x"), caption: "@PrithviBtw · 672 posts", position: "top" },
  },
  {
    label: "GitHub",
    href: "https://github.com/prithvi-bharadwaj",
    favicon: LOGO("github"),
    media: { type: "image", src: SHOT("social-github"), caption: "1,811 contributions in the last year" },
  },
  { label: "Medium", href: "https://medium.com/@prithvibofficial", favicon: "/logos/medium.svg" },
  {
    label: "Substack",
    href: "https://prithvibharadwaj.substack.com",
    favicon: LOGO("substack"),
    media: { type: "image", src: SHOT("social-substack"), caption: "Prithvi's Substack" },
  },
];

/* ── Sitemap (also drives the controls panel's jump links) ── */

export const SECTIONS: PanelSection[] = [
  { id: "intro", label: "intro" },
  { id: "previously", label: "previously" },
  { id: "built", label: "shipped in 2026" },
  { id: "lore", label: "lore" },
  { id: "writing", label: "writing" },
  { id: "socials", label: "elsewhere" },
];
