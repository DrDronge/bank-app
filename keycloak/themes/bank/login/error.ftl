<#import "template.ftl" as layout>
<@layout.registrationLayout displayMessage=false; section>

  <#if section = "">
    <h1 class="bw-heading">Something went wrong</h1>
    <p class="bw-subheading">We couldn't complete your request.</p>

    <div class="bw-alert bw-alert-error">
      ${kcSanitize(message.summary)?no_esc}
    </div>

    <#if client?? && client.baseUrl?has_content>
      <a class="bw-btn" href="${client.baseUrl}"
         style="display:block;text-align:center;text-decoration:none;margin-top:0.5rem;">
        ${msg("backToApplication")}
      </a>
    <#else>
      <a class="bw-btn-secondary" href="${url.loginUrl}"
         style="display:block;text-align:center;text-decoration:none;margin-top:0.5rem;">
        &larr; ${msg("backToLogin")}
      </a>
    </#if>
  </#if>

</@layout.registrationLayout>
