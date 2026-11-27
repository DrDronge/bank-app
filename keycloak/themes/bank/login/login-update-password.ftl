<#import "template.ftl" as layout>
<@layout.registrationLayout displayMessage=!messagesPerField.existsError('password','password-confirm'); section>

  <#if section = "">
    <h1 class="bw-heading">${msg("updatePasswordTitle")}</h1>
    <p class="bw-subheading">Choose a strong new password.</p>

    <form class="bw-form" action="${url.loginAction}" method="post">
      <input type="hidden" id="username" name="username"
             value="${(auth.attemptedUsername!username!'')}" autocomplete="username"/>

      <div class="bw-field">
        <label class="bw-label" for="password-new">${msg("passwordNew")}</label>
        <div class="bw-input-wrap">
          <input
            class="bw-input<#if messagesPerField.existsError('password','password-confirm')> error</#if>"
            type="password" id="password-new" name="password-new"
            autofocus autocomplete="new-password"
          />
          <button type="button" class="bw-eye" aria-label="Toggle password visibility"
                  onclick="togglePassword('password-new', this)">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"
                 fill="none" stroke="currentColor" stroke-width="2"
                 stroke-linecap="round" stroke-linejoin="round">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
              <circle cx="12" cy="12" r="3"/>
            </svg>
          </button>
        </div>
        <#if messagesPerField.existsError('password')>
          <span class="bw-field-error">${kcSanitize(messagesPerField.get('password'))?no_esc}</span>
        </#if>
      </div>

      <div class="bw-field">
        <label class="bw-label" for="password-confirm">${msg("passwordConfirm")}</label>
        <div class="bw-input-wrap">
          <input
            class="bw-input<#if messagesPerField.existsError('password-confirm')> error</#if>"
            type="password" id="password-confirm" name="password-confirm"
            autocomplete="new-password"
          />
          <button type="button" class="bw-eye" aria-label="Toggle password visibility"
                  onclick="togglePassword('password-confirm', this)">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"
                 fill="none" stroke="currentColor" stroke-width="2"
                 stroke-linecap="round" stroke-linejoin="round">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
              <circle cx="12" cy="12" r="3"/>
            </svg>
          </button>
        </div>
        <#if messagesPerField.existsError('password-confirm')>
          <span class="bw-field-error">${kcSanitize(messagesPerField.get('password-confirm'))?no_esc}</span>
        </#if>
      </div>

      <#if isAppInitiatedAction??>
        <div class="bw-btn-row">
          <button class="bw-btn" type="submit">${msg("doSubmit")}</button>
          <button class="bw-btn-secondary" type="submit" name="cancel-aia" value="true">
            ${msg("doCancel")}
          </button>
        </div>
      <#else>
        <button class="bw-btn" type="submit">${msg("doSubmit")}</button>
      </#if>
    </form>
  </#if>

</@layout.registrationLayout>

<script>
  function togglePassword(fieldId, btn) {
    var input = document.getElementById(fieldId);
    var isHidden = input.type === 'password';
    input.type = isHidden ? 'text' : 'password';
    btn.innerHTML = isHidden
      ? '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>'
      : '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>';
  }
</script>
