export const getHtmlForWebview = (svg: string | void) => {
  if (!svg) {
    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Cat Coding</title>
</head>
<body>
<h1>Error while parsing the spec</h1>
</body>
</html>`;
  }
  else {

    return `<!DOCTYPE html>
    <html lang="en">
    <head>
    <meta charset="UTF-8">
    
    <!--
    Use a content security policy to only allow loading images from https or from our extension directory,
    and only allow scripts that have a specific nonce.
    -->
    
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Cat Coding</title>
    </head>
    <body>
    ${svg}
    </body>
    </html>`;
  }
};

