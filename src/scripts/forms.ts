// Validation and submission for the contact and supplier forms.
// With an endpoint configured the form is posted to it; without one, the
// visitor's email app opens with the message already written.

const messages: Record<string, string> = {
  valueMissing: 'This field is required.',
  typeMismatch: 'Check the format of this entry.',
  patternMismatch: 'Check the format of this entry.',
};

function errorFor(input: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement) {
  const v = input.validity;
  if (v.valid) return '';
  if (v.valueMissing) return input.dataset.required || messages.valueMissing;
  if (v.typeMismatch && input.type === 'email') return 'Enter an email address, like name@company.com.';
  if (v.typeMismatch && input.type === 'url') return 'Enter a web address starting with https://';
  return input.validationMessage || messages.patternMismatch;
}

function showError(input: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement) {
  const field = input.closest('.field');
  if (!field) return true;
  const msg = errorFor(input);
  let el = field.querySelector<HTMLElement>('.field__error');
  field.classList.toggle('is-invalid', !!msg);
  if (msg) {
    if (!el) {
      el = document.createElement('p');
      el.className = 'field__error';
      el.id = `${input.id}-error`;
      field.appendChild(el);
    }
    el.textContent = msg;
    input.setAttribute('aria-invalid', 'true');
    const hint = field.querySelector('.field__hint');
    input.setAttribute('aria-describedby', hint ? `${hint.id} ${el.id}` : el.id);
  } else {
    el?.remove();
    input.removeAttribute('aria-invalid');
    const hint = field.querySelector('.field__hint');
    if (hint) input.setAttribute('aria-describedby', hint.id);
    else input.removeAttribute('aria-describedby');
  }
  return !msg;
}

function mailBody(form: HTMLFormElement) {
  const lines: string[] = [];
  form.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>('[name]').forEach((el) => {
    const label = el.dataset.label || form.querySelector(`label[for="${el.id}"]`)?.textContent?.replace(/\s*\(optional\)\s*/i, '').trim() || el.name;
    let value = el.value.trim();
    if (el instanceof HTMLInputElement && el.type === 'checkbox') value = el.checked ? 'Yes' : 'No';
    if (value) lines.push(`${label}: ${value}`);
  });
  return lines.join('\n');
}

document.querySelectorAll<HTMLFormElement>('form[data-form]').forEach((form) => {
  const status = form.querySelector<HTMLElement>('.form__status');
  const submit = form.querySelector<HTMLButtonElement>('[type="submit"]');
  const inputs = Array.from(form.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>('input, select, textarea'));
  form.noValidate = true;

  inputs.forEach((i) => {
    i.addEventListener('blur', () => showError(i));
    i.addEventListener('input', () => i.closest('.field')?.classList.contains('is-invalid') && showError(i));
  });

  const say = (text: string) => {
    if (!status) return;
    status.hidden = false;
    status.textContent = text;
  };

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const bad = inputs.filter((i) => !showError(i));
    if (bad.length) {
      bad[0].focus();
      say(bad.length === 1 ? 'One field needs attention before this can be sent.' : `${bad.length} fields need attention before this can be sent.`);
      return;
    }
    const endpoint = form.dataset.endpoint;
    const to = form.dataset.mailto!;
    if (!endpoint) {
      const subject = (form.querySelector<HTMLInputElement>('[name="subject"]')?.value || form.dataset.subject || 'Website enquiry').trim();
      window.location.href = `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(mailBody(form))}`;
      say(`Your email app should now be open with your details filled in. Send it from there. If nothing opened, email ${to} directly.`);
      return;
    }
    try {
      if (submit) submit.disabled = true;
      say('Sending…');
      const res = await fetch(endpoint, { method: 'POST', body: new FormData(form), headers: { Accept: 'application/json' } });
      if (!res.ok) throw new Error(String(res.status));
      form.reset();
      say(form.dataset.sent || 'Sent. We will be in touch.');
    } catch {
      say(`This could not be sent. Check your connection and send it again, or email ${to} directly.`);
    } finally {
      if (submit) submit.disabled = false;
    }
  });
});
