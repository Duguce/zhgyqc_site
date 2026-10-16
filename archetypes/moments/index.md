---
title: "{{ replace .Name "-" " " | title }}"
date: {{ .Date }}
draft: true
# Set a stable URL before publishing, for example /moments/my-note/.
cover: "images/cover.jpg"
cover_alt: "Describe the cover photo"
cover_caption: ""
---

{{ printf "{{< photo src=%q alt=%q caption=%q width=%q >}}" "images/cover.jpg" "Describe the photo" "" "80" }}
