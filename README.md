# CoworkSpace · Notification Service

![CI-CD](https://github.com/CoworkSpace-Arquitectura/coworkspace-notification/actions/workflows/deploy.yml/badge.svg)

Microservicio de avisos para los miembros. Escucha todos los eventos del sistema (`membership.*`, `booking.*`, `billing.*`) y los convierte en notificaciones dentro de la app, sin consultar a ningún otro servicio.

- **Endpoints:** `/notifications?memberId=`, `/notifications/unread-count`, `/notifications/read-all`, `/notifications/:id/read`
- **Puerto local:** 3007
- **Idempotencia:** cada evento genera como máximo un aviso (`event_key` único)