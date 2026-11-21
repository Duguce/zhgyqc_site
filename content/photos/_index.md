---
title: Photo Wall
outputs: [HTML]
# Paired prints stay together; unlisted photos fill the remaining space.
exhibit:
  groups:
    lake: [beihai-white-dagoba-night, beihai-white-dagoba-day]
    ridge: [fenghuangling-heavenly-ladder, [fenghuangling-autumn-leaves, fenghuangling-white-dog]]
    stone: [fenghuangling-feilai-pagoda, fenghuangling-jade-rabbit-stone]
    moon: [silver-moon, orange-moon]
    temple: [temple-of-heaven-evening, hall-of-prayer]
    blossoms: [beihang-white-flowers, beihang-pink-flowers]
  landscape: [lake, stone, ridge, moon, blossoms, temple]
  portrait: [lake, ridge, stone, blossoms, moon, temple]
  weights: {beihai-white-dagoba-night: 1.8, beihai-white-dagoba-day: 1.15, fenghuangling-heavenly-ladder: 1.55, temple-of-heaven-evening: 1.55, orange-moon: 0.7, silver-moon: 0.7}
  ratios: {fenghuangling-white-dog: 1, silver-moon: 1, orange-moon: 1}
  focus: {fenghuangling-white-dog: "48% 65%", temple-of-heaven-evening: "52% 57%", imperial-vault-of-heaven: "50% 35%", big-wild-goose-pagoda: "50% 18%", xian-bell-tower-night: "50% 28%"}
  trim_bottom: {beihang-white-flowers: 0.09, beihang-pink-flowers: 0.09}
additional_photos:
  2026-10-24-fenghuangling-autumn-hike:
    - {src: images/fenghuangling-heavenly-ladder.jpg, alt: The Heavenly Ladder on Fenghuangling}
    - {src: images/fenghuangling-jade-rabbit-stone.jpg, alt: Jade Rabbit Stone on Fenghuangling}
  2026-06-01-capturing-the-moon:
    - {src: images/silver-moon.jpg, alt: Craters on the silver moon}
  2026-05-16-temple-of-heaven-weekend:
    - {src: images/imperial-vault-of-heaven.jpg, alt: The Imperial Vault of Heaven}
  2026-04-09-beihang-spring-flowers:
    - {src: images/beihang-pink-flowers.jpg, alt: Pink spring blossoms on Beihang campus}
cascade:
  _target:
    kind: page
  _build:
    list: local
    render: never
    publishResources: false
---
