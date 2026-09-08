const entries = [...document.querySelectorAll('[data-resume-entry]')];
const hover = window.matchMedia('(min-width: 761px) and (hover: hover) and (pointer: fine)');
let activeEntry = null;

function closePreview(entry) {
  entry.classList.remove('is-preview-open');
  entry.querySelector('.entry-preview').hidden = true;
  entry.querySelector('.resume-preview-toggle').setAttribute('aria-expanded', 'false');
  if (activeEntry === entry) activeEntry = null;
}

function openPreview(entry) {
  if (activeEntry === entry) return;
  if (activeEntry) closePreview(activeEntry);
  entry.classList.add('is-preview-open');
  entry.querySelector('.entry-preview').hidden = false;
  entry.querySelector('.resume-preview-toggle').setAttribute('aria-expanded', 'true');
  activeEntry = entry;
}

for (const entry of entries) {
  const toggle = entry.querySelector('.resume-preview-toggle');
  toggle.hidden = false;
  entry.addEventListener('pointerenter', event => {
    if (hover.matches && event.pointerType === 'mouse') openPreview(entry);
  });
  entry.addEventListener('pointerleave', () => {
    if (hover.matches && !entry.contains(document.activeElement)) closePreview(entry);
  });
  entry.addEventListener('focusin', event => {
    if (event.target.matches('.resume-entry-link:focus-visible')) openPreview(entry);
  });
  entry.addEventListener('focusout', event => {
    if (!entry.contains(event.relatedTarget) && !entry.matches(':hover')) closePreview(entry);
  });
  toggle.addEventListener('click', () => {
    if (activeEntry === entry) closePreview(entry);
    else openPreview(entry);
  });
}

document.addEventListener('keydown', event => {
  if (event.key !== 'Escape' || !activeEntry) return;
  const entry = activeEntry;
  if (entry.querySelector('.entry-preview').contains(document.activeElement)) {
    entry.querySelector('.resume-preview-toggle').focus();
  }
  closePreview(entry);
});
document.addEventListener('pointerdown', event => {
  if (activeEntry && !activeEntry.contains(event.target)) closePreview(activeEntry);
});
