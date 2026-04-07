<#import "template.ftl" as layout>
<@layout.registrationLayout displayMessage=false; section>

  <#if section = "">
    <div class="bw-alert bw-alert-error">
      ${kcSanitize(message.summary)?no_esc}
    </div>

    <#if client?? && client.baseUrl?has_content>
      <a class="bw-btn" href="${client.baseUrl}"
         style="display:block;text-align:center;text-decoration:none;">
        ${msg("backToApplication"!"Back to application")}
      </a>
    <#else>
      <a class="bw-btn-secondary" href="${url.loginUrl}"
         style="display:block;text-align:center;text-decoration:none;">
        ${msg("backToLogin"!"Back to sign in")}
      </a>
    </#if>
  </#if>

</@layout.registrationLayout>
