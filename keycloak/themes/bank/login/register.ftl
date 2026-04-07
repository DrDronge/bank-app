<#import "template.ftl" as layout>
<@layout.registrationLayout displayMessage=!messagesPerField.existsError('firstName','lastName','email','username','password','password-confirm'); section>

  <#if section = "">
    <h1 class="bw-heading">${msg("registerTitle")}</h1>
    <p class="bw-subheading">${msg("registerSubtitle"!"Create your account")}</p>

    <form class="bw-form" action="${url.registrationAction}" method="post">

      <#if !realm.registrationEmailAsUsername>
        <div class="bw-field">
          <label class="bw-label" for="firstName">${msg("firstName")}</label>
          <input
            class="bw-input<#if messagesPerField.existsError('firstName')> error</#if>"
            type="text" id="firstName" name="firstName"
            value="${(register.formData.firstName!'')}"
            autocomplete="given-name" autofocus
          />
          <#if messagesPerField.existsError('firstName')>
            <span class="bw-field-error">${kcSanitize(messagesPerField.get('firstName'))?no_esc}</span>
          </#if>
        </div>

        <div class="bw-field">
          <label class="bw-label" for="lastName">${msg("lastName")}</label>
          <input
            class="bw-input<#if messagesPerField.existsError('lastName')> error</#if>"
            type="text" id="lastName" name="lastName"
            value="${(register.formData.lastName!'')}"
            autocomplete="family-name"
          />
          <#if messagesPerField.existsError('lastName')>
            <span class="bw-field-error">${kcSanitize(messagesPerField.get('lastName'))?no_esc}</span>
          </#if>
        </div>
      </#if>

      <div class="bw-field">
        <label class="bw-label" for="email">${msg("email")}</label>
        <input
          class="bw-input<#if messagesPerField.existsError('email')> error</#if>"
          type="email" id="email" name="email"
          value="${(register.formData.email!'')}"
          autocomplete="email"
          <#if realm.registrationEmailAsUsername>autofocus</#if>
        />
        <#if messagesPerField.existsError('email')>
          <span class="bw-field-error">${kcSanitize(messagesPerField.get('email'))?no_esc}</span>
        </#if>
      </div>

      <#if !realm.registrationEmailAsUsername>
        <div class="bw-field">
          <label class="bw-label" for="username">${msg("username")}</label>
          <input
            class="bw-input<#if messagesPerField.existsError('username')> error</#if>"
            type="text" id="username" name="username"
            value="${(register.formData.username!'')}"
            autocomplete="username"
          />
          <#if messagesPerField.existsError('username')>
            <span class="bw-field-error">${kcSanitize(messagesPerField.get('username'))?no_esc}</span>
          </#if>
        </div>
      </#if>

      <#if passwordRequired?? && passwordRequired>
        <div class="bw-field">
          <label class="bw-label" for="password">${msg("password")}</label>
          <div class="bw-input-wrap">
            <input
              class="bw-input<#if messagesPerField.existsError('password','password-confirm')> error</#if>"
              type="password" id="password" name="password"
              autocomplete="new-password"
            />
            <button type="button" class="bw-eye" aria-label="Toggle password visibility"
                    onclick="togglePassword('password', this)">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"
                   fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
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
                   fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                <circle cx="12" cy="12" r="3"/>
              </svg>
            </button>
          </div>
          <#if messagesPerField.existsError('password-confirm')>
            <span class="bw-field-error">${kcSanitize(messagesPerField.get('password-confirm'))?no_esc}</span>
          </#if>
        </div>
      </#if>

      <#if recaptchaRequired?? && recaptchaRequired>
        <div class="bw-field">
          <div class="g-recaptcha" data-size="compact" data-sitekey="${recaptchaSiteKey}"></div>
        </div>
      </#if>

      <button class="bw-btn" type="submit">${msg("doRegister")}</button>
    </form>

    <div class="bw-footer">
      ${msg("alreadyHaveAccount"!"Already have an account?")}
      <a href="${url.loginUrl}">${msg("doLogIn")}</a>
    </div>
  </#if>

</@layout.registrationLayout>

<script>
  function togglePassword(fieldId, btn) {
    var input = document.getElementById(fieldId);
    if (input.type === 'password') {
      input.type = 'text';
      btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>';
    } else {
      input.type = 'password';
      btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>';
    }
  }
</script>
