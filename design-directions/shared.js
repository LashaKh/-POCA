const menuButtons = document.querySelectorAll('[data-menu-toggle]');

menuButtons.forEach((button) => {
  const menuId = button.getAttribute('aria-controls');
  const menu = menuId ? document.getElementById(menuId) : null;

  if (!menu) return;

  const setOpen = (open) => {
    button.setAttribute('aria-expanded', String(open));
    menu.dataset.open = String(open);
    if (open) menu.querySelector('a, button')?.focus();
  };

  button.addEventListener('click', () => {
    setOpen(button.getAttribute('aria-expanded') !== 'true');
  });

  menu.addEventListener('click', (event) => {
    if (event.target.closest('a')) setOpen(false);
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && button.getAttribute('aria-expanded') === 'true') {
      setOpen(false);
      button.focus();
    }
  });
});

const status = document.querySelector('[data-demo-status]');
document.querySelectorAll('[data-demo-action]').forEach((control) => {
  control.addEventListener('click', () => {
    if (status) status.textContent = `${control.dataset.demoAction} — concept interaction only.`;
  });
});

const filterButtons = document.querySelectorAll('[data-filter]');
const filterItems = document.querySelectorAll('[data-collection]');

filterButtons.forEach((button) => {
  button.addEventListener('click', () => {
    const filter = button.dataset.filter;
    filterButtons.forEach((item) => item.setAttribute('aria-pressed', String(item === button)));
    filterItems.forEach((item) => {
      item.hidden = filter !== 'all' && item.dataset.collection !== filter;
    });
    if (status) status.textContent = `Showing ${button.textContent.trim()} sample pieces.`;
  });
});

