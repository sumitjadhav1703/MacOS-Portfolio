// Motion constants, verbatim from the original design.

export const EASE = 'cubic-bezier(.32,.72,0,1)'

export const SPRING =
  'linear(0,0.006,0.025 2.8%,0.101 6.1%,0.539 18.9%,0.721 25.3%,0.849 31.5%,0.937 38.1%,0.968 41.8%,0.991 45.7%,1.006 50.1%,1.015 55%,1.017 63.9%,1.006 79%,1)'

export const SPRING_B =
  'linear(0,0.09 3.3%,0.33 7.6%,0.75 13.6%,0.998 17.6%,1.08,1.14 22.6%,1.17 26%,1.16 29.6%,1.1 34.9%,1.03 40.6%,0.998 44.4%,0.973 49%,0.968 53.2%,0.981 60%,1.001 71%,1.005 78%,1)'

export const WIN_T = `opacity .28s ease,transform .58s ${SPRING},box-shadow .3s ease`
