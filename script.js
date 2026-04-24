const root = document.documentElement;
const revealItems = document.querySelectorAll('[data-reveal]');
const navLinks = document.querySelectorAll('.topbar__nav a');
const sections = [...document.querySelectorAll('main section[id]')];
const toast = document.querySelector('.toast');

function updateProgress() {
  const max = document.body.scrollHeight - window.innerHeight;
  const progress = max > 0 ? (window.scrollY / max) * 100 : 0;
  root.style.setProperty('--scroll-progress', `${progress}%`);
}

function showToast(message) {
  if (!toast) return;
  toast.textContent = message;
  toast.setAttribute('aria-hidden', 'false');
  toast.classList.add('is-visible');
  window.setTimeout(() => {
    toast.classList.remove('is-visible');
    toast.setAttribute('aria-hidden', 'true');
  }, 2200);
}

const revealObserver = new IntersectionObserver(
  entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        revealObserver.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.12 }
);

revealItems.forEach(item => revealObserver.observe(item));

const sectionObserver = new IntersectionObserver(
  entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const id = entry.target.getAttribute('id');
      navLinks.forEach(link => {
        link.classList.toggle('is-active', link.getAttribute('href') === `#${id}`);
      });
    });
  },
  { rootMargin: '-35% 0px -55% 0px', threshold: 0.01 }
);

sections.forEach(section => sectionObserver.observe(section));

window.addEventListener('scroll', updateProgress, { passive: true });
window.addEventListener('resize', updateProgress);
updateProgress();

const filterButtons = document.querySelectorAll('[data-filter]');
const capabilityCards = document.querySelectorAll('.capability-card');

filterButtons.forEach(button => {
  button.addEventListener('click', () => {
    const filter = button.dataset.filter;

    filterButtons.forEach(item => item.classList.remove('is-active'));
    button.classList.add('is-active');

    capabilityCards.forEach(card => {
      const categories = card.dataset.category || '';
      const shouldShow = filter === 'all' || categories.split(' ').includes(filter);
      card.hidden = !shouldShow;
    });
  });
});

const copyButton = document.querySelector('[data-copy-summary]');
const profileSummary =
  'Edwin Brown is a U.S. Army veteran, operations-focused leader, and technical builder with experience across public administration, finance, project delivery, data systems, and AI-assisted workflows. He combines disciplined accountability, graduate-level training, bilingual communication, and practical technical execution.';

copyButton?.addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(profileSummary);
    showToast('Profile summary copied.');
  } catch {
    showToast('Copy blocked by browser. Select the summary manually.');
  }
});

document.querySelector('[data-print]')?.addEventListener('click', () => {
  window.print();
});

const tiltCards = document.querySelectorAll('.tilt-card');

function handleTilt(event) {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const card = event.currentTarget;
  const rect = card.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;
  const rotateY = ((x / rect.width) - 0.5) * 5;
  const rotateX = ((y / rect.height) - 0.5) * -5;
  card.style.transform = `perspective(900px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-3px)`;
}

function resetTilt(event) {
  event.currentTarget.style.transform = '';
}

tiltCards.forEach(card => {
  card.addEventListener('mousemove', handleTilt);
  card.addEventListener('mouseleave', resetTilt);
});
