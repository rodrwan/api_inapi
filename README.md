# Inapi API Extractor

Esta aplicación realiza consultas sobre el servicio de Inapi, procesando esa información y dandole un uso más específico.

# Web service

Este web service contiene dos rutas principales

`/inapi/<marca>` Donde `<marca>` es el nombre de la marca que se de sea buscar.
`/inapi/id/<solicitud>` Donde `<solicitud>` es el id único que entrega Inapi al momento de registrar una marca.
Con este ID se obtienen datos específicos de la marca registrada.

# Instalación

Para instalar las dependencias que usa este servicio, en la terminal correr. Estando en el directorio.

```sh
$ npm install
```

Luego:

```sh
$ node main.js
```
