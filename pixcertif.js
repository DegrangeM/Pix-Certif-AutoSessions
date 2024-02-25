if (location.hostname === "certif.pix.fr") {
  function wait() {
    return new Promise((resolve) => setTimeout(resolve, 1000));
  }

  let input = prompt(`Merci de copier votre tableau de données (ne pas copier la première ligne d'entête).
Nom du site | Classe | Date | Heure | Observation | Surveillants | Nom de la salle`, "");

  if (input !== null) {
    document.body.style.cursor = 'wait';

    let ACCESS_TOKEN;
    let ORGA_ID;
    let SESSIONS;

    Promise.resolve().then(() => {
      SESSIONS = input.split(/\r?\n/).map(x => x.split("\t")).map(x => ({
        site: x[0].replaceAll('"', ''),
        classe: x[1].replaceAll('"', ''),
        date: x[2].replaceAll('"', ''),
        heure: x[3].replaceAll('"', ''),
        observation: x[4].replaceAll('"', ''),
        surveillants: x[5].replaceAll('"', ''),
        salle: x[6].replaceAll('"', '')
      }));

      /* ETAPE 1 : On récupère le token de session */

      ACCESS_TOKEN = JSON.parse(localStorage.getItem('ember_simple_auth-session')).authenticated.access_token;
      ORGA_ID = false;

      /* ETAPE 2 : On récupère l'ID d'établissement */
    }).then(() => fetch("https://certif.pix.fr/api/certification-point-of-contacts/me", {
      "headers": {
        "accept": "application/vnd.api+json",
        "accept-language": "fr",
        "authorization": "Bearer " + ACCESS_TOKEN,
        "sec-ch-ua": "\"Not_A Brand\";v=\"99\", \"Google Chrome\";v=\"109\", \"Chromium\";v=\"109\"",
        "sec-ch-ua-mobile": "?0",
        "sec-ch-ua-platform": "\"Windows\"",
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-origin"
      },
      "body": null,
      "method": "GET",
      "mode": "cors",
      "credentials": "include"
    })).then(response => response.json())
      .then(json => {
        ORGA_ID = json.included[0].id;
      })
      .then(wait)
      .then(() => {

        /* ETAPE 3 : On crée les sessions de certification */
        let p = Promise.resolve();
        for (let session of SESSIONS) {
          let sessionId;
          p = p.then(
            () => fetch("https://certif.pix.fr/api/certification-centers/" + ORGA_ID + "/session", {
              "headers": {
                "accept": "application/vnd.api+json",
                "accept-language": "fr",
                "authorization": "Bearer " + ACCESS_TOKEN,
                "content-type": "application/vnd.api+json",
                "sec-ch-ua": "\"Not_A Brand\";v=\"99\", \"Google Chrome\";v=\"109\", \"Chromium\";v=\"109\"",
                "sec-ch-ua-mobile": "?0",
                "sec-ch-ua-platform": "\"Windows\"",
                "sec-fetch-dest": "empty",
                "sec-fetch-mode": "cors",
                "sec-fetch-site": "same-origin"
              },
              "referrer": "https://certif.pix.fr/sessions/creation",
              "referrerPolicy": "origin-when-cross-origin",
              "body": "{\"data\":{\"attributes\":{\"address\":\"" + session.site + "\",\"access-code\":null,\"date\":\"" + session.date + "\",\"time\":\"" + session.heure + "\",\"description\":\"" + session.observation + "\",\"examiner\":\"" + session.surveillants + "\",\"room\":\"" + session.salle + "\",\"status\":null,\"examiner-global-comment\":null,\"supervisor-password\":null,\"has-supervisor-access\":false,\"has-some-clea-acquired\":false,\"has-incident\":false,\"has-joining-issue\":false,\"certification-center-id\":" + ORGA_ID + "},\"type\":\"sessions\"}}",
              "method": "POST",
              "mode": "cors",
              "credentials": "include"
            })
          ).then(response => response.json())
            .then(json => {
              sessionId = json.data.id;
            })
            .then(wait);
          if (session.classe) {
            /* Etape 3bis1 : On récupère les élèves de la classe */
            let eleves;
            p = p.then(() => fetch("https://certif.pix.fr/api/certification-centers/" + ORGA_ID + "/sessions/" + sessionId + "/students?filter%5Bdivisions%5D%5B%5D=" + session.classe + "&page%5Bnumber%5D=1&page%5Bsize%5D=100", {
              "headers": {
                "accept": "application/vnd.api+json",
                "accept-language": "fr",
                "authorization": "Bearer " + ACCESS_TOKEN,
                "sec-ch-ua": "\"Not_A Brand\";v=\"99\", \"Google Chrome\";v=\"109\", \"Chromium\";v=\"109\"",
                "sec-ch-ua-mobile": "?0",
                "sec-ch-ua-platform": "\"Windows\"",
                "sec-fetch-dest": "empty",
                "sec-fetch-mode": "cors",
                "sec-fetch-site": "same-origin"
              },
              "body": null,
              "method": "GET",
              "mode": "cors",
              "credentials": "include"
            })).then(response => response.json())
              .then(json => {
                eleves = json.data.map(x => x.id)
              })
              .then(wait)
              /* Etape 3bis2 : On inscrit les élèves de la classe */
              .then(() => fetch("https://certif.pix.fr/api/sessions/" + sessionId + "/enrol-students-to-session", {
                "headers": {
                  "accept": "application/vnd.api+json",
                  "accept-language": "fr",
                  "authorization": "Bearer " + ACCESS_TOKEN,
                  "content-type": "application/vnd.api+json",
                  "sec-ch-ua": "\"Not_A Brand\";v=\"99\", \"Google Chrome\";v=\"109\", \"Chromium\";v=\"109\"",
                  "sec-ch-ua-mobile": "?0",
                  "sec-ch-ua-platform": "\"Windows\"",
                  "sec-fetch-dest": "empty",
                  "sec-fetch-mode": "cors",
                  "sec-fetch-site": "same-origin"
                },
                "body": "{\"data\":{\"attributes\":{\"organization-learner-ids\":[" + eleves.map(x => '"' + x + '"').join(',') + "]}}}",
                "method": "PUT",
                "mode": "cors",
                "credentials": "include"
              })).then(wait)
          }
        }
        return p;
      }).then(() => { document.body.style.cursor = 'default'; alert('Terminé !'); location.reload(); })
      .catch((e) => { document.body.style.cursor = 'not-allowed'; alert('Erreur : ' + e); });
  }
} else {
  alert('Ce script doit être utilisé sur le site de Pix certif !');
}
