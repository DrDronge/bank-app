<#import "template.ftl" as layout>
<@layout.registrationLayout displayInfo=true displayMessage=!messagesPerField.existsError('username'); section>

  <#if section = "">
    <h1 class="bw-heading">${msg("emailForgotTitle")}</h1>
    <p class="bw-subheading">
      <#if realm.loginWithEmailAllowed && !realm.registrationEmailAsUsername>
        ${msg("emailInstruction"!"Enter your username or email and we'll send you a reset link.")}
      <#else>
        ${msg("emailInstructionUsername"!"Enter your email and we'll send you a reset link.")}
      </#if>
    </p>

    <form class="bw-form" action="${url.loginAction}" method="post">
      <div class="bw-field">
        <label class="bw-label" for="username">
          <#if !realm.loginWithEmailAllowed>${msg("username")}
          <#elseif !realm.registrationEmailAsUsername>${msg("usernameOrEmail")}
          <#else>${msg("email")}
          </#if>
        </label>
        <input
          class="bw-input<#if messagesPerField.existsError('username')> error</#if>"
          type="text" id="username" name="username"
          value="${(auth.attemptedUsername!'')}"
          autofocus autocomplete="username"
        />
        <#if messagesPerField.existsError('username')>
          <span class="bw-field-error">${kcSanitize(messagesPerField.get('username'))?no_esc}</span>
        </#if>
      </div>

      <button class="bw-btn" type="submit">${msg("doSubmit")}</button>
    </form>

    <div class="bw-footer">
      <a href="${url.loginUrl}">&larr; ${msg("backToLogin"!"Back to sign in")}</a>
    </div>
  </#if>

  <#if section = "info">
    ${msg("emailSent"!"Check your inbox for the password reset link.")}
  </#if>

</@layout.registrationLayout>
