const menuButton = document.querySelector('.menu-toggle');
const navigation = document.querySelector('#primary-navigation');
const mobile = window.matchMedia('(max-width: 760px)');
document.documentElement.classList.add('js');

function closeMenu(returnFocus = false) {
  menuButton.setAttribute('aria-expanded', 'false');
  navigation.classList.remove('is-open');
  navigation.inert = mobile.matches;
  if (returnFocus) menuButton.focus();
}
menuButton.hidden = false;
closeMenu();
menuButton.addEventListener('click', () => {
  const open = menuButton.getAttribute('aria-expanded') !== 'true';
  menuButton.setAttribute('aria-expanded', String(open));
  navigation.classList.toggle('is-open', open);
  navigation.inert = !open && mobile.matches;
});
mobile.addEventListener('change', () => closeMenu());
navigation.addEventListener('click', event => {
  if (event.target.closest('a')) closeMenu();
});
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && menuButton.getAttribute('aria-expanded') === 'true') closeMenu(true);
});
document.addEventListener('click', event => {
  if (menuButton.getAttribute('aria-expanded') === 'true' && !event.target.closest('.header-inner')) closeMenu();
});
document.querySelector('[data-year]').textContent = String(new Date().getFullYear());
const copyButton = document.querySelector('[data-copy-email]');
if (copyButton) {
  copyButton.hidden = false;
  const status = document.querySelector('[data-copy-status]');
  copyButton.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText('josephbressani1117@gmail.com');
      status.textContent = 'Email address copied.';
      copyButton.textContent = 'Copied ✓';
    } catch {
      status.textContent = 'Copy is unavailable. Select the email address above to copy it.';
    }
  });
}
