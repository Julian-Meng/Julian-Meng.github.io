export function initSliderToggle() {
    const wrapper = document.getElementById('slider-wrapper');
    const toggle = document.getElementById('slider-toggle');
    if (!wrapper || !toggle) return;

    const card = document.querySelector('#slider-container .card');

    const syncHeight = () => {
        if (card) {
            toggle.style.height = card.getBoundingClientRect().height + 'px';
        }
    };

    syncHeight();
    setTimeout(syncHeight, 300);
    window.addEventListener('resize', syncHeight);

    toggle.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = wrapper.classList.toggle('open');
        toggle.setAttribute('aria-expanded', String(isOpen));
    });
}
