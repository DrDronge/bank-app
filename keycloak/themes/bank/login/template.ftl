<#macro registrationLayout bodyClass="" displayInfo=false displayMessage=true displayRequiredFields=false>
<!DOCTYPE html>
<html lang="${(locale.currentLanguageTag)!"en"}">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="robots" content="noindex, nofollow">
  <title>${msg("loginTitle",(realm.displayName!'BudgetWise'))}</title>
  <link rel="stylesheet" href="${url.resourcesPath}/css/login.css">
</head>
<body>
  <div class="bw-page">
    <div class="bw-card">

      <div class="bw-logo">
        <div class="bw-logo-icon">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"
               fill="none" stroke="currentColor" stroke-width="2.5"
               stroke-linecap="round" stroke-linejoin="round">
            <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/>
            <polyline points="16 7 22 7 22 13"/>
          </svg>
        </div>
        <div class="bw-logo-text">
          <span class="bw-logo-name">${realm.displayName!'BudgetWise'}</span>
          <span class="bw-logo-sub">Personal Finance</span>
        </div>
      </div>

      <#if displayMessage && message?has_content && (message.type != 'warning' || !isAppInitiatedAction??)>
        <div class="bw-alert bw-alert-${message.type}">
          ${kcSanitize(message.summary)?no_esc}
        </div>
      </#if>

      <#nested "">

      <#if displayInfo>
        <div class="bw-info-box">
          <#nested "info">
        </div>
      </#if>

    </div>

    <p class="bw-page-footer">Secured by Keycloak</p>
  </div>

  <#if scripts??>
    <#list scripts as script>
      <script src="${script}" type="text/javascript"></script>
    </#list>
  </#if>
</body>
</html>
</#macro>
