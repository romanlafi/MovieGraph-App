# GitHub Actions y cobertura en SonarCloud

El workflow `.github/workflows/sonarcloud.yml` ejecuta las pruebas existentes del
backend con Python 3.13 y coverage.py, instala el frontend con `npm ci`, pasa
lint/build y envía el análisis a SonarCloud. No despliega la aplicación ni usa
credenciales de Cloudflare, TMDB o Neon. Las pruebas usan SQLite y dobles de
prueba; no aplican migraciones a bases de datos remotas.

## Configuración externa

1. Revoca el token que aparece en la captura compartida y genera uno nuevo en
   SonarCloud. No lo añadas a archivos del repositorio ni lo pegues en el chat.
2. En GitHub, abre **Settings > Secrets and variables > Actions > Secrets** y
   crea el secreto de repositorio `SONAR_TOKEN` con el nuevo valor.
3. En SonarCloud, deja **Administration > Analysis Method > Automatic analysis**
   desactivado. La cobertura requiere análisis desde CI.
4. Comprueba que el proyecto es `romanlafi_MovieGraph-App`, la organización es
   `romanlafi` y la rama principal de SonarCloud es `main`.
5. Sube estos cambios y revisa **Actions > Quality and coverage**. El informe
   `coverage.xml` se conserva como artefacto `backend-coverage` durante 14 días.

Los checks se ejecutan en pushes a `dev`, `staging` y `main`, y en pull requests
hacia esas ramas. También se pueden lanzar con **Run workflow** una vez que el
workflow esté en la rama por defecto de GitHub.

Por defecto se envía a SonarCloud el análisis de `main` y de las pull requests
internas hacia `main`, compatible con el plan Free. Si tu organización tiene
plan OSS/Team/Enterprise y permite analizar otras ramas, crea la variable de
repositorio **Variables > `SONAR_BRANCH_ANALYSIS` = `true`** para enviar también
`dev`, `staging` y las PR hacia esas ramas. Las PR desde forks ejecutan los
checks, pero omiten SonarCloud porque no reciben el secreto.

El escáner falla si falta el secreto en una ejecución que deba analizarse.
El workflow envía el análisis; no espera ni impone el resultado del Quality
Gate. El estado del gate se consulta en SonarCloud o en su integración con
GitHub; los tests, lint, build y errores del escáner sí hacen fallar el job.

## Qué mide esta primera configuración

- Analiza el código Python de `back/app` y TypeScript/React de `front/src`.
- Importa cobertura real de las pruebas `unittest` del backend, incluidas sus
  ejecuciones en subprocesos. Combina los datos antes de generar Cobertura XML.
- Usa rutas relativas para que el informe se pueda resolver desde el escáner.
- El frontend todavía no tiene tests ni informe LCOV: lint/build no generan
  cobertura. Sus líneas sin probar siguen contando en SonarCloud; no se excluyen
  para mejorar artificialmente el porcentaje.
- La cobertura se obtiene en CPython con el runtime Worker simulado. No acredita
  por sí sola la ejecución real en Cloudflare ni la integración con Hyperdrive.

## Reproducir en local

Desde la raíz, con el entorno virtual del proyecto activo:

```text
python -m pip install -r requirements-test.txt
```

En PowerShell:

```powershell
$env:PYTHONPATH = 'back'
python -m coverage erase
python -m coverage run -m unittest discover -s back/tests -v
python -m coverage combine
python -m coverage xml
python -m coverage report
npm.cmd --prefix front ci
npm.cmd --prefix front run lint
npm.cmd --prefix front run build
```

En Linux/macOS, usa `PYTHONPATH=back python -m coverage run -m unittest discover
-s back/tests -v` y `npm` en lugar de `npm.cmd`. Ejecuta `combine` y los informes
desde la raíz, igual que en CI. Los datos e informes de cobertura están ignorados
por Git. `requirements-test.txt` añade coverage.py a las dependencias locales;
no cambia las dependencias del Worker.

## Referencias

- [Cobertura Python y análisis desde CI](https://docs.sonarsource.com/sonarqube-cloud/analyzing-source-code/test-coverage/python-test-coverage)
- [Acción oficial del escáner](https://github.com/SonarSource/sonarqube-scan-action)
- [Cobertura de subprocesos](https://coverage.readthedocs.io/en/latest/subprocess.html)
- [Planes y análisis de ramas](https://docs.sonarsource.com/sonarqube-cloud/administering-sonarcloud/managing-subscription/subscription-plans)
