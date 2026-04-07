<#import "template.ftl" as layout>
<@layout.registrationLayout displayMessage=false; section>

  <#if section = "">
    <div class="bw-alert bw-alert-${(message.type)!'info'}">
      ${kcSanitize(message.summary)?no_esc}
    </div>

    <#if requiredActions??>
      <ul style="margin: 0 0 1.25rem; padding-left: 1.25rem; font-size:0.875rem; color:#64748b; line-height:1.8;">
        <#list requiredActions as reqActionItem>
          <li>${msg("requiredAction.${reqActionItem}")}</li>
        </#list>
      </ul>
    </#if>

    <#if skipLink??>
      <p style="text-align:center; margin-top:1rem;">
        <a class="bw-link" href="${skipLink}">${msg("doClickHere")}</a>
        ${msg("requiredActionNotice"!"to proceed.")}
      </p>
    <#elseif pageRedirectUri??>
      <a class="bw-btn" href="${pageRedirectUri}" style="display:block;text-align:center;text-decoration:none;">
        ${msg("backToApplication"!"Back to application")}
      </a>
    <#elseif actionUri??>
      <a class="bw-btn" href="${actionUri}" style="display:block;text-align:center;text-decoration:none;">
        ${msg("proceedWithAction"!"Continue")}
      </a>
    <#else>
      <a class="bw-btn-secondary" href="${url.loginUrl}"
         style="display:block;text-align:center;text-decoration:none;">
        ${msg("backToLogin"!"Back to sign in")}
      </a>
    </#if>
  </#if>

</@layout.registrationLayout>
