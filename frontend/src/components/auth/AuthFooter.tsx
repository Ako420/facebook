const languages = [
  "English (US)",
  "Español",
  "Français (France)",
  "中文(简体)",
  "العربية",
  "Português (Brasil)",
  "Italiano",
];

const links = [
  "Sign Up", "Log In", "Messenger", "Facebook Lite", "Video", "Meta Pay",
  "Meta Store", "Meta Quest", "Ray-Ban Meta", "Meta AI", "Instagram", "Threads",
  "Privacy Policy", "Consumer Health Privacy", "Privacy Center",
  "Cookie Settings", "About", "Create ad", "Create Page", "Developers",
  "Careers", "Cookies", "Ad choices", "Terms", "Help",
  "Contact Uploading & Non-Users",
];

/**
 * The link mat at the bottom of both auth screens. Every entry is decorative —
 * this clone has no marketing pages behind them.
 */
export function AuthFooter() {
  return (
    <footer className="border-t border-line px-4 py-6 text-ink-muted sm:px-8">
      <div className="mx-auto max-w-6xl">
        <ul className="flex flex-wrap items-center gap-x-6 gap-y-2 text-[13px]">
          {languages.map((language) => (
            <li key={language}>
              <button type="button" className="hover:underline">
                {language}
              </button>
            </li>
          ))}
          <li>
            <button
              type="button"
              aria-label="More languages"
              className="rounded-sm bg-surface-raised px-2 text-ink-muted hover:bg-line"
            >
              More languages...
            </button>
          </li>
        </ul>

        <ul className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs">
          {links.map((link) => (
            <li key={link}>
              <button type="button" className="hover:underline">
                {link}
              </button>
            </li>
          ))}
        </ul>

        <p className="mt-4 text-xs text-ink-faint">Meta © 2026</p>
      </div>
    </footer>
  );
}
