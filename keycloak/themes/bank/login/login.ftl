<#import "template.ftl" as layout>
<@layout.registrationLayout displayMessage=!messagesPerField.existsError('username','password'); section>

  <#if section = "">
    <h1 class="bw-heading">${msg("loginAccountTitle")}</h1>
    <p class="bw-subheading">Sign in to your account</p>

    <#if social?? && social.providers?has_content>
      <div class="bw-social">
        <#list social.providers as p>
          <a href="${p.loginUrl}" class="bw-social-btn" id="social-${p.alias}">
            <#if p.iconCssClass?has_content>
              <i class="${p.iconCssClass}" aria-hidden="true"></i>
            </#if>
            <span>${p.displayName!}</span>
          </a>
        </#list>
      </div>
      <div class="bw-divider">${msg("identity-provider-login-label")}</div>
    </#if>

    <form class="bw-form" action="${url.loginAction}" method="post">
      <input type="hidden" id="id-hidden-input" name="credentialId"
             <#if auth.selectedCredential?has_content>value="${auth.selectedCredential}"</#if>/>

      <div class="bw-field">
        <label class="bw-label" for="username">
          <#if !realm.loginWithEmailAllowed>${msg("username")}
          <#elseif !realm.registrationEmailAsUsername>${msg("usernameOrEmail")}
          <#else>${msg("email")}
          </#if>
        </label>
        <input
          class="bw-input<#if messagesPerField.existsError('username','password')> error</#if>"
          id="username" name="username" type="text"
          value="${(login.username!'')}"
          autofocus autocomplete="username"
          <#if usernameEditDisabled??>readonly</#if>
        />
        <#if messagesPerField.existsError('username')>
          <span class="bw-field-error">${kcSanitize(messagesPerField.get('username'))?no_esc}</span>
        </#if>
      </div>

      <div class="bw-field">
        <label class="bw-label" for="password">${msg("password")}</label>
        <div class="bw-input-wrap">
          <input
            class="bw-input<#if messagesPerField.existsError('username','password')> error</#if>"
            id="password" name="password" type="password"
            autocomplete="current-password"
          />
          <button type="button" class="bw-eye" aria-label="Toggle password visibility"
                  onclick="togglePassword('password', this)">
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

      <#if realm.rememberMe?? && realm.rememberMe || realm.resetPasswordAllowed>
        <div class="bw-row">
          <#if realm.rememberMe?? && realm.rememberMe>
            <label class="bw-checkbox-label">
              <input class="bw-checkbox" type="checkbox" name="rememberMe"
                     <#if login.rememberMe?? && login.rememberMe>checked</#if>/>
              ${msg("rememberMe")}
            </label>
          </#if>
          <#if realm.resetPasswordAllowed>
            <a class="bw-link" href="${url.loginResetCredentialsUrl}">${msg("doForgotPassword")}</a>
          </#if>
        </div>
      </#if>

      <button class="bw-btn" type="submit" name="login" value="true">
        ${msg("doLogIn")}
      </button>
    </form>

    <#if realm.password && realm.registrationAllowed && !registrationDisabled??>
      <div class="bw-footer">
        ${msg("noAccount")} <a href="${url.registrationUrl}">${msg("doRegister")}</a>
      </div>
    </#if>
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
