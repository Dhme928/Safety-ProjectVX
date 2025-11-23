// =========================================
// Central configuration & data for the safety app
// All URLs & safety libraries live here so app.js
// can focus on logic + UI.
// =========================================

// ========== GOOGLE FORMS (EMBEDS & LINKS) ==========

// Daily tasks / checklist form (embedded in Tasks tab)
window.TASKS_FORM_EMBED_URL =
  'https://docs.google.com/forms/d/e/1FAIpQLSezm0wWTdEsvkIdnzhfpRf0G37tZzqbY-AF-BHfbXXiLr2rKA/viewform?embedded=true';

// Add new observation form (used by floating green button)
window.ADD_OBSERVATION_FORM_URL =
  'https://docs.google.com/forms/d/e/1FAIpQLSfYED_4UfHcmWn0fQOjtR5s8A0-Bhr4dwpe-80GjKkLeTR_Lw/viewform?usp=header';

// ========== GOOGLE SHEETS (CSV & VIEW LINKS) ==========

// Employee of the Month + Leaderboard sheet (CSV)
window.EOM_SHEET_URL =
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vQ0Km9p6XYDDxyGYSFfUjDjhdKMtr_hFvCiJ-U5_24_-QKrGsexZ4v3dxzKp0K1XZenNsiV7CiNmQEt/pub?output=csv';

// Observations main data sheet (CSV)
window.OBSERVATIONS_SHEET_CSV_URL =
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vTXlN-sE-IkQJLMaVOvRGSBYNLsDvwZTD15w7rarTIXBGoacF0C5_eiI7OmFs__zA8jtlwhy0ULLZ8N/pub?output=csv';

// News / Announcements sheet (CSV)
window.NEWS_SHEET_CSV_URL =
  'https://docs.google.com/spreadsheets/d/1_SwxL5f4mWF5kd2yofCMCEE_WQp_2eroHDhXXPXtw1U/export?format=csv&gid=0';

// Full observations HTML sheet (opened when user taps
// "Open full data sheet" button in Observations tab)
window.OBSERVATIONS_FULL_SHEET_URL =
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vTXlN-sE-IkQJLMaVOvRGSBYNLsDvwZTD15w7rarTIXBGoacF0C5_eiI7OmFs__zA8jtlwhy0ULLZ8N/pubhtml';

// Optional default color code of the month (used as
// fallback if EOM sheet has no value for this month)
window.DEFAULT_MONTH_COLOR_NAME = 'White';

// =========================================
// TBT LIBRARY
// =========================================
//
// Each item: { title: "TBT Title", link: "Google Drive link" }

window.tbtData = [
  { title: "TBT of The Day Alcohol and Drugs", link: "https://drive.google.com/file/d/1uIGAjyY2UuxdkWToEGqMoF-L1Q9cIn5c/view?usp=drivesdk" },
  { title: "TBT of The Day Biohazard infection materials", link: "https://drive.google.com/file/d/1wUY8mlaEXOroUK5IoPPbBpym97Jdjfm4/view?usp=drivesdk" },
  { title: "TBT of The Day Cold Weather", link: "https://drive.google.com/file/d/1QOp3TVAb-si19p-taHpPjSwEfXs1O5us/view?usp=drivesdk" },
  { title: "TBT of The Day Compressed Gas", link: "https://drive.google.com/file/d/1a7tLsOI7Re7QAWDivisUFdakbvpSEYOt/view?usp=drivesdk" },
  { title: "TBT of The Day Construction Fires", link: "https://drive.google.com/file/d/1nXBiIuAEjs4om2NwASqfyhtT-8IUBpGt/view?usp=drivesdk" },
  { title: "TBT of The Day Corrosive Materials", link: "https://drive.google.com/file/d/1VaFxPYhYt0Ho8blbkGQi2S4ubsT882ge/view?usp=drivesdk" },
  { title: "TBT of The Day Dangerously reactive material", link: "https://drive.google.com/file/d/16CNFN5iuf3YFyVW-tYNVQgHkRu8z8deg/view?usp=drivesdk" },
  { title: "TBT of The Day Dial before you Dig", link: "https://drive.google.com/file/d/1YlWyaHh2lPoum-OYYoJ2qP8t948qwLZI/view?usp=drivesdk" },
  { title: "TBT of The Day Driving in Reverse", link: "https://drive.google.com/file/d/1QzLSWz3CFfjGdmj62OsFdvT5IcV_lrqJ/view?usp=drivesdk" },
  { title: "TBT of The Day Emergency Response", link: "https://drive.google.com/file/d/1bWiXimPy6SmqbtEs5LxJE9zvS765GSzN/view?usp=drivesdk" },
  { title: "TBT of The Day Equipment Guards", link: "https://drive.google.com/file/d/1i4o3HHM6O2EPJ1hf-2IQ97_AREDCMIDr/view?usp=drivesdk" },
  { title: "TBT of The Day Exercise and Health", link: "https://drive.google.com/file/d/13pnUXqSmGNuXHAGKG7TyKhwryEWbtAaO/view?usp=drivesdk" },
  { title: "TBT of The Day Eye Protection", link: "https://drive.google.com/file/d/13HufH-DcwH-P-pEZZKTUNzHSo2lzyzLa/view?usp=drivesdk" },
  { title: "TBT of The Day Fall Protection", link: "https://drive.google.com/file/d/1RPpUrSAzCOE8uGUlE1sCXH0woxxzJqw4/view?usp=drivesdk" },
  { title: "TBT of The Day Fire Prevention", link: "https://drive.google.com/file/d/1Sz8Kobsyj3Sib4vhKvY2JDPjJUs2MERC/view?usp=drivesdk" },
  { title: "TBT of The Day First Aid Kit", link: "https://drive.google.com/file/d/1g50xudoRJVXxXvum4vbNaEebSvM_Kkyo/view?usp=drivesdk" },
  { title: "TBT of The Day First aid kits Naloxia", link: "https://drive.google.com/file/d/1XQ8Zy1xI621BA2oktxLesZiXh0DiWFER/view?usp=drivesdk" },
  { title: "TBT of The Day Ground Stability", link: "https://drive.google.com/file/d/1afLmut5ReTTZspJqEBd2sg1pAxq9y3F0/view?usp=drivesdk" },
  { title: "TBT of The Day Hand Protection", link: "https://drive.google.com/file/d/1NeYb6ZIpm8sqU-VcyLDqrOwDvHnmZwrq/view?usp=drivesdk" },
  { title: "TBT of The Day Hand tools", link: "https://drive.google.com/file/d/1L9n9G5HRo4Gi0bw_g-7eBxsrtBi7ADPG/view?usp=drivesdk" },
  { title: "TBT of The Day Hand Tools and PPE", link: "https://drive.google.com/file/d/1CrvCgTI0uMztvKsEGgafHwJNQoWBaF-K/view?usp=drivesdk" },
  { title: "TBT of The Day Hearing Conservation", link: "https://drive.google.com/file/d/19_gZ3vWtx1Vx56Nyx7z3BEB3I5XdvZ6y/view?usp=drivesdk" },
  { title: "TBT of The Day Heat Stress", link: "https://drive.google.com/file/d/1FlnBFJR3oWVlmvaptbvEHurdVrZHm7hh/view?usp=drivesdk" },
  { title: "TBT of The Day HID and Driving Awareness", link: "https://drive.google.com/file/d/1NHrzYkF5AfIG7sxgu1Vf8pU5XsWhThfK/view?usp=drivesdk" },
  { title: "TBT of The Day High Pressure Equipment Safety", link: "https://drive.google.com/file/d/1Z6dYVSGFeGXc5ByA7tV0XRXmHVI3V3L0/view?usp=drivesdk" },
  { title: "TBT of The Day Housekeeping", link: "https://drive.google.com/file/d/1tRet-AThes-9zgXQruo9c-MTgw-_zVdc/view?usp=drivesdk" },
  { title: "TBT of The Day How to Inspect your Gloves", link: "https://drive.google.com/file/d/1HLmzQDnDGtEY4xamLE7rTWdH9islH0Fu/view?usp=drivesdk" },
  { title: "TBT of The Day Indoor Hazards", link: "https://drive.google.com/file/d/1vU2WmuBBceUufEX0dAnd65aXmodHT5LF/view?usp=drivesdk" },
  { title: "TBT of The Day Insects Bites", link: "https://drive.google.com/file/d/1ajVsD83kZMpMKsDYSqpNI0WK2MpEgxyx/view?usp=drivesdk" },
  { title: "TBT of The Day Lead Material", link: "https://drive.google.com/file/d/1SNT0t6LarP-UcZUPNR-hrb7JwEPy6cXG/view?usp=drivesdk" },
  { title: "TBT of The Day Manual Handling", link: "https://drive.google.com/file/d/1RV69YCoHVqPHouy5tF9c7ab5aDG8pmo9/view?usp=drivesdk" },
  { title: "TBT of The Day Mechanical Equipment", link: "https://drive.google.com/file/d/1XZ_xQ7bCqdJXqfbrPkMXUbF4IcCw3q7_/view?usp=drivesdk" },
  { title: "TBT of The Day Noise", link: "https://drive.google.com/file/d/1nFQ0Pm5bj1Cgi660JrpZ-iy_N2CCF4cl/view?usp=drivesdk" },
  { title: "TBT of The Day Office Safety", link: "https://drive.google.com/file/d/11hHS314Vh_dfCYOo9r3QCGmjD4zlT4Ok/view?usp=drivesdk" },
  { title: "TBT of The Day Personal Protection Equipment", link: "https://drive.google.com/file/d/1yizSxE4ZIYufBkJ7Pq3wl7GGFvSY4bUo/view?usp=drivesdk" },
  { title: "TBT of The Day Plant and Machinery", link: "https://drive.google.com/file/d/1fQJRLO1M6GmjjdHpqW-uL1pMPnnrdPLQ/view?usp=drivesdk" },
  { title: "TBT of The Day Qualified Operators", link: "https://drive.google.com/file/d/1eBVA8jJivO8dV2Se9_ZdrplOtKxf_Xwu/view?usp=drivesdk" },
  { title: "TBT of The Day Reporting Accidents", link: "https://drive.google.com/file/d/1grVco6aH7hLEmAGc9x7qbLSbrOyGxSGb/view?usp=drivesdk" },
  { title: "TBT of The Day Risk Assessment", link: "https://drive.google.com/file/d/1lZ7V6W8ylA3TVRo4Zm3fF8sYNTw3LfnW/view?usp=drivesdk" },
  { title: "TBT of The Day Safe Lifting of Objects", link: "https://drive.google.com/file/d/1pZkmeepCfjVOoovZLf35fh1QFjhyVSg7/view?usp=drivesdk" },
  { title: "TBT of The Day Safe Operation of MEWP", link: "https://drive.google.com/file/d/1HsJ7pCokUIVSdyyCvPpbDUFAQQiqNeh9/view?usp=drivesdk" },
  { title: "TBT of The Day Safe Operation of Pneumatic Tools", link: "https://drive.google.com/file/d/1bfxwvthfR2pABZKiiZ-wwEd2jUXcv7HX/view?usp=drivesdk" },
  { title: "TBT of The Day Safe Operation Portable power tools", link: "https://drive.google.com/file/d/1rg7ZjUSYJPasy_47p5cRTrWui7oHO1rp/view?usp=drivesdk" },
  { title: "TBT of The Day Safe Operation of Scaffolding", link: "https://drive.google.com/file/d/1SXUjbENSXzhfIvJIFkwEQopqecTZihNq/view?usp=drivesdk" },
  { title: "TBT of The Day Safe operation of tools", link: "https://drive.google.com/file/d/1syflkSRazQJJvY5B9ESzAcns0SyQQzQZ/view?usp=drivesdk" },
  { title: "TBT of The Day Safe Work on roof", link: "https://drive.google.com/file/d/12T4MbPdMW_p-Vtpw9RK4_eo2c1v4FttH/view?usp=drivesdk" },
  { title: "TBT of The Day Safe Work Practice", link: "https://drive.google.com/file/d/1gVXFDHisfRTRQoTBAXdyZK_0NCGxxjCB/view?usp=drivesdk" },
  { title: "TBT of The Day Safe Work with hand tools", link: "https://drive.google.com/file/d/1HNC7ldy8c4F3veRMN0ZFNGhH2q5fiScR/view?usp=drivesdk" },
  { title: "TBT of The Day Safe Working Practice Construction", link: "https://drive.google.com/file/d/14VqfTpa6exin7SmjJS3j9vZwZLh5-dNs/view?usp=drivesdk" },
  { title: "TBT of The Day Safe Working with Electrical Equipment", link: "https://drive.google.com/file/d/1DDxelLTZAeeb2sJEWfhKF0UNFhmQmjhM/view?usp=drivesdk" },
  { title: "TBT of The Day Safe Working with Drill, Concrete, Core Cutting , Chipping", link: "https://drive.google.com/file/d/1uadL2bi--xLbRL-yM3zpHWAGi60uxZ_n/view?usp=drivesdk" },
  { title: "TBT of The Day Safe working with Heavy Equipment", link: "https://drive.google.com/file/d/1xMOCzvFQlFls88pj9ecBYZzRIp03c9BH/view?usp=drivesdk" },
  { title: "TBT of The Day Safe Working with Heavy Tools", link: "https://drive.google.com/file/d/1M7894AHqrSmj4gSzdTYFa8RnJet4mPic/view?usp=drivesdk" },
  { title: "TBT of The Day Safe Working with ladders", link: "https://drive.google.com/file/d/1b7Mepx2_zUDylghCKtq_I6xUAsdKGyOx/view?usp=drivesdk" },
  { title: "TBT of The Day Safe Working with traffic routes", link: "https://drive.google.com/file/d/1eUzcDAb-xIUVexEtZUiNS0vHZ_oFfq8x/view?usp=drivesdk" },
  { title: "TBT of The Day Safe Working with Vehicle", link: "https://drive.google.com/file/d/1vJ2svjwJ9XgXtBF0eMvAeLLjfCaV-5-a/view?usp=drivesdk" },
  { title: "TBT of The Day Safety Awareness", link: "https://drive.google.com/file/d/1yWrqcoXxBOZetGmkxgsShPZCWQSkKA_G/view?usp=drivesdk" },
  { title: "TBT of The Day Safety in Industrial area", link: "https://drive.google.com/file/d/1dH1XY6hAJz296ymAIF6u3vCWYzUASx1e/view?usp=drivesdk" },
  { title: "TBT of The Day Scaffolding", link: "https://drive.google.com/file/d/1tL8epcXq_yJqG5wzHpfql7ufxLToi9SL/view?usp=drivesdk" },
  { title: "TBT of The Day Slips, Trips and Falls", link: "https://drive.google.com/file/d/1F7TNF2sKAwLKN__Sei7BF3JDpzVkcFEP/view?usp=drivesdk" },
  { title: "TBT of The Day Smoke and Toxic Gases", link: "https://drive.google.com/file/d/1NiNlYJL9iOkYGCqe9lMUldj1I7mHTpZz/view?usp=drivesdk" },
  { title: "TBT of The Day Suitable Tools", link: "https://drive.google.com/file/d/1Azg5I-8yd7XFf7GscvZ0NqNqWefKHPKm/view?usp=drivesdk" },
  { title: "TBT of The Day Traffic Route", link: "https://drive.google.com/file/d/1oGI1MpGDbaxYLip7no8_ox5nq5lVzScE/view?usp=drivesdk" },
  { title: "TBT of The Day Use of Compressed Gas", link: "https://drive.google.com/file/d/1HSCKjDvErdFP3SX9WgbUvaVThZbT5FdW/view?usp=drivesdk" },
  { title: "TBT of The Day Use of PPE", link: "https://drive.google.com/file/d/1vnXmG5di_9iVLCHvOLfbTofkBBpVqAAx/view?usp=drivesdk" },
  { title: "TBT of The Day Vehicle and Transportation", link: "https://drive.google.com/file/d/1gW-NPGfujHFXbbRvj1n-MOH_i3xm7Q2m/view?usp=drivesdk" },
  { title: "TBT of The Day Vehicle movement on site", link: "https://drive.google.com/file/d/1gAmc2WO_smXxVUxGwjFvLBmI3kcRrMlp/view?usp=drivesdk" },
  { title: "TBT of The Day Walking on uneven ground", link: "https://drive.google.com/file/d/1vN5ZabdcpY3RJfIxRjWJHT3sejVfl5hP/view?usp=drivesdk" },
  { title: "TBT of The Day Welding, Cutting and Grinding", link: "https://drive.google.com/file/d/1oM-xIISFvS5VcterChmJzvmmC7gMiFL0/view?usp=drivesdk" },
  { title: "TBT of The Day Workplace safety plan", link: "https://drive.google.com/file/d/1enLU0T27BLTNotJuCiIp0O206n4VWXQo/view?usp=drivesdk" },
  { title: "TBT of The Day Working at Height", link: "https://drive.google.com/file/d/1IQXxqEvuUcLOdwZtGt9j7_fg7SG91oyl/view?usp=drivesdk" },
  { title: "TBT of The Day Working in cold environments", link: "https://drive.google.com/file/d/1D3VpCDuZMyFCIHVd1XufmEqN_s_cqAi0/view?usp=drivesdk" },
  { title: "TBT of The Day Working in Confined Spaces", link: "https://drive.google.com/file/d/1mUuYt5TonFky6vwUeKaM7NVTL-xRBA4c/view?usp=drivesdk" },
  { title: "TBT of The Day Working near Excavations", link: "https://drive.google.com/file/d/1-fsjfModLdme2Xw_alZgiWZ5-rnbEIFR/view?usp=drivesdk" },
  { title: "TBT of The Day Working on bridges", link: "https://drive.google.com/file/d/1YaIuC4cltwTfS7TiJU7VYIf6XeKZqSo-/view?usp=drivesdk" },
  { title: "TBT of The Day Working on moving vehicle", link: "https://drive.google.com/file/d/1sGLUH42ud5I9i_o1jMtpH_S-eu5TJ1J3/view?usp=drivesdk" },
  { title: "TBT of The Day Working with Hazardous Materials", link: "https://drive.google.com/file/d/1gYF6cUISYjUZF_pLEKadmPbe49YM2_ph/view?usp=drivesdk" }
];

// =========================================
// JSA LIBRARY
// =========================================
//
// Each item: { title: "JSA Title", link: "Google Drive link" }

window.jsaData = [
  { title: "Abrasive Blasting And Coating", link: "https://drive.google.com/file/d/1tZBj37GGJ7h9uRYDI5TIL04OkNrEMoLu/view?usp=drivesdk" },
  { title: "Backfilling Levelling And Compaction", link: "https://drive.google.com/file/d/1I32miHCfXBzETNx5UePxwHY4f9Fi-Fd1/view?usp=drivesdk" },
  { title: "Backfilling Levelling And Compaction Around Concrete Guards", link: "https://drive.google.com/file/d/1Fiei1faeqkuNCxR_-FMOlBF66w1ELC-0/view?usp=drivesdk" },
  { title: "Bolt Tightening And Torquing Activity", link: "https://drive.google.com/file/d/1iEyD5UObnaZ0TppEgmsAI-I0ELKYzdik/view?usp=drivesdk" },
  { title: "Cable Laying in Electrical Manhole", link: "https://drive.google.com/file/d/1Wp8i107zfvQfBgmo3w87FicqkbJ-YlzX/view?usp=drivesdk" },
  { title: "Checking Lifting Cables", link: "https://drive.google.com/file/d/1HTuLhegqg63HDC0g4LYLHRZvvsvKlgMj/view?usp=drivesdk" },
  { title: "Civil Work for HDD Road Crossing and Survey Works", link: "https://drive.google.com/file/d/1ZCt-ymqSm538XKifw7IGveIgSBklV-FM/view?usp=drivesdk" },
  { title: "Coating and Painting", link: "https://drive.google.com/file/d/11Hvb1voK2OvES76nYruhbkI00OZIa2bO/view?usp=drivesdk" },
  { title: "Cold Cutting Activity", link: "https://drive.google.com/file/d/1w8dkyJ4_KdrXhMvBKffpSmWLvGYRD_PS/view?usp=drivesdk" },
  { title: "Conductor and MLDT Installation", link: "https://drive.google.com/file/d/1DrsTymUDKM_g_vQ3Cp80mW9iyM6G4Wmx/view?usp=drivesdk" },
  { title: "Concrete Cutting and Demolition", link: "https://drive.google.com/file/d/13rKL8nwFYmPC-gMMHhpgmW-Ht-gTgbFa/view?usp=drivesdk" },
  { title: "Concrete Pouring Work", link: "https://drive.google.com/file/d/1jBzQEzvUibCXixT_OBMKHXwS35KKYdlC/view?usp=drivesdk" },
  { title: "Conduit And Drain Pipe Installation", link: "https://drive.google.com/file/d/1DkYftrZ9soByBRmZtmkA6iFm8wvTu3CT/view?usp=drivesdk" },
  { title: "Culvert Installation Activities", link: "https://drive.google.com/file/d/1H1_apctHNyH1f_k18oaXZXVj78W0bdZs/view?usp=drivesdk" },
  { title: "Cutting and Bevelling Work", link: "https://drive.google.com/file/d/1SGg1kNsHSxEH0LJcitBFDDCRglfGbNnI/view?usp=drivesdk" },
  { title: "Driving Off Road", link: "https://drive.google.com/file/d/1F0_hFnmHPdAmEzAgCbgUTpzxSWjAtRoI/view?usp=drivesdk" },
  { title: "Duct Bank and Marker Installation", link: "https://drive.google.com/file/d/1n819UkZXVgKGB_-8xSz0T8tSCxd2G9pg/view?usp=drivesdk" },
  { title: "E & I Calibrations and Instrument Testing", link: "https://drive.google.com/file/d/1tZvf-B8gJbQUoKdsjkCYmZPJq8LXS_Oq/view?usp=drivesdk" },
  { title: "E & I Cable Laying and Termination Activities", link: "https://drive.google.com/file/d/1Q06KpF1_psWnnAQ_52MJjnrFQoxRn2Eq/view?usp=drivesdk" },
  { title: "E & I Installation Activities", link: "https://drive.google.com/file/d/1N7uxi_5adFadC0uYfC92k7m9lLkQRsI9/view?usp=drivesdk" },
  { title: "E & I Installation Inside Substation", link: "https://drive.google.com/file/d/1FObIYqXr49dSXvK7mUbR_HdrqKvBruGw/view?usp=drivesdk" },
  { title: "Electro Mechanical QA QC Activities", link: "https://drive.google.com/file/d/1hIJPnTAQ5FU6ku6iZ2er3SvB3IU-7qxB/view?usp=drivesdk" },
  { title: "Equipment Pre commissioning", link: "https://drive.google.com/file/d/1cX3uHpn4RUZHicjnabgxgcV5bgHqUqf0/view?usp=drivesdk" },
  { title: "Excavation And Trenching Activities", link: "https://drive.google.com/file/d/1G3ewcaKqsKsK7kIpRi7ErZ5UuFmSQQo2/view?usp=drivesdk" },
  { title: "Fabrication and Erection of Steel Structure", link: "https://drive.google.com/file/d/1euR77zoBmj1yfJXt2qgLUa4uIvmM75TU/view?usp=drivesdk" },
  { title: "Field Joint Coating Activities", link: "https://drive.google.com/file/d/1y31FL8RQehGLE977fqIrGIqJKdP5_MzA/view?usp=drivesdk" },
  { title: "Flare KO Drum Installation Activities", link: "https://drive.google.com/file/d/16d3e27BHovQUgatctfDpCjuTCmLxivlO/view?usp=drivesdk" },
  { title: "Hand Excavation", link: "https://drive.google.com/file/d/1x0Lao8Pgyz-nuBwajEhM--XKN-wAzVKZ/view?usp=drivesdk" },
  { title: "Hand Excavation and Excavation Around Existing Facilities", link: "https://drive.google.com/file/d/1w1YUqFPVW2n0kfrxGb9QrEXvB6dA2uoY/view?usp=drivesdk" },
  { title: "Handling and Loading of Heavy Equipment Onto Low Bed Trailer", link: "https://drive.google.com/file/d/1tHMeXuDF_arQ5mdUsCYFJ56tTn9fKe8N/view?usp=drivesdk" },
  { title: "Heavy Equipment Movement", link: "https://drive.google.com/file/d/1-yoZFdAYQ2MZ4caqon3qSr7nqi3HbdAj/view?usp=drivesdk" },
  { title: "Heavy Equipment Operation", link: "https://drive.google.com/file/d/1FgI8uQUibNo1sWZTuyLD-xAxulS7VXaM/view?usp=drivesdk" },
  { title: "Heavy Equipment Operation and Manoeuvring in Work Site", link: "https://drive.google.com/file/d/1NDCoBZy-ayELHILwPgGD_sSz69Wo_AUS/view?usp=drivesdk" },
  { title: "Heavy Equipment Pre Moblisation", link: "https://drive.google.com/file/d/1sHt503_Kd3iBdkO0YB-BVGK2Ks0WJ4mT/view?usp=drivesdk" },
  { title: "Heavy Equipment Pre Mobilisation", link: "https://drive.google.com/file/d/1pB-AyExXgstZKyz8_wkowB_kWAUfBDbi/view?usp=drivesdk" },
  { title: "Heavy Vehicle Driving", link: "https://drive.google.com/file/d/151Q44VXIvTXh1xyYIm94sHN6IIessdle/view?usp=drivesdk" },
  { title: "Heavy Vehicle Movement inside Refinery", link: "https://drive.google.com/file/d/1hzCw1qzOr23pOEfRPhyiRUzs1Jhl5pHV/view?usp=drivesdk" },
  { title: "Heavy Vehicle Operation", link: "https://drive.google.com/file/d/18ocXGqE6DeXfne-4wtZne56-gI4z2s8U/view?usp=drivesdk" },
  { title: "Holiday and Defect Repair Activities", link: "https://drive.google.com/file/d/1o-Q_n8EI7dWIPzQ0QD8LfSyVDamZSrwH/view?usp=drivesdk" },
  { title: "Hot Tapping Activities", link: "https://drive.google.com/file/d/1fw5O9cFYtJ39uyX-ggTNHYODHHeCsZ0z/view?usp=drivesdk" },
  { title: "Hot Work Inside Refinery", link: "https://drive.google.com/file/d/1WRi44gyMgYrPplrW7xKmtSd2mm5sr8S7/view?usp=drivesdk" },
  { title: "Hot Work with Cold Cutting Activities", link: "https://drive.google.com/file/d/1l3GUHqLDi3H_gwLyputynWJwMQ37g6qx/view?usp=drivesdk" },
  { title: "Housekeeping Activities", link: "https://drive.google.com/file/d/1C8YqNAkt6xGh7lqG51WivOGsyR3OullG/view?usp=drivesdk" },
  { title: "Hydrotesting of Pipe Line", link: "https://drive.google.com/file/d/1_aQ8-UiNhlv6rcMFf98KcEEGs5ARH2vV/view?usp=drivesdk" },
  { title: "Installation of Cable Tray and Ladder", link: "https://drive.google.com/file/d/1uKNobEawMyCUN-DuhktF7TqN7bW5nKbu/view?usp=drivesdk" },
  { title: "Installation of Control Valve,  PSV, MOV, Blind Blind Flange and Vent Valve", link: "https://drive.google.com/file/d/1hc_32uUlTOZYw93kB7GvTaylor/view?usp=drivesdk" },
  { title: "Installation of Electrical Panel and Switchgear", link: "https://drive.google.com/file/d/1qvrydnktRL-HpmJ8Gn0czpWMEitnRrH_/view?usp=drivesdk" },
  { title: "Installation of Fence and Gates", link: "https://drive.google.com/file/d/1aSUh2xIfxV29R0hIJrKbqG4U6ZlQKp0I/view?usp=drivesdk" },
  { title: "Installation of Fire Water Facility", link: "https://drive.google.com/file/d/1uKG2pcIP-BPcXc-EDjvFb5afpRLEaQgs/view?usp=drivesdk" },
  { title: "Installation of Flare Stack Foundation", link: "https://drive.google.com/file/d/1TXa6CQf5AFE_YrRFpv_b2G7nlILCYay4/view?usp=drivesdk" },
  { title: "Installation of Pipe Rack and Piping", link: "https://drive.google.com/file/d/1_rjTyict8TdTQMS0sRs5sH3CHfDIlbbA/view?usp=drivesdk" },
  { title: "Installation of Piping on Sleepers", link: "https://drive.google.com/file/d/1cJb0pd7FBeZm9uhRkfgKWcFa1QgGnPIW/view?usp=drivesdk" },
  { title: "Installation of Pneumatic and Hydraulic Tubing", link: "https://drive.google.com/file/d/1MPiCD2x8c2mNw-fWHM4AtbKJK-YuPQiz/view?usp=drivesdk" },
  { title: "Installation of Process Vessel and Drum", link: "https://drive.google.com/file/d/1d0C5PdgVld6V9UhxqNz70dKkTWNyNjc5/view?usp=drivesdk" },
  { title: "Installation of Pumps", link: "https://drive.google.com/file/d/1XrXF9QQWSWku0Srl2L_PVQINGNPL9Ldr/view?usp=drivesdk" },
  { title: "Installation of Rigid and Flexible Pavement", link: "https://drive.google.com/file/d/1OGKyNVgw0_DTFUWxyV7oQXtTaCNJ3d18/view?usp=drivesdk" },
  { title: "Installation of Steel Structure", link: "https://drive.google.com/file/d/13G0U5DsfgvCaVxPCDb6VK3jGKJzq2k3l/view?usp=drivesdk" },
  { title: "Installation of Structural Foundations", link: "https://drive.google.com/file/d/1tbN7i0_8SJ1gsCwO6v5LyOzJVXFZNR5a/view?usp=drivesdk" },
  { title: "Installation of Valve and Spectacle Blind", link: "https://drive.google.com/file/d/1pvcFZz3uL8RqIOvk4u7QYlX0dbcdRFSw/view?usp=drivesdk" },
  { title: "Loading and Unloading of Material", link: "https://drive.google.com/file/d/1X1y8uFvhlZz-oN3rZ4HeaZ3b5XHMiDC7/view?usp=drivesdk" },
  { title: "Manual Handling Activities", link: "https://drive.google.com/file/d/1YG5MBO06LH9xvKfGda6uH_jJkmB8J5tZ/view?usp=drivesdk" },
  { title: "Operation of Crane", link: "https://drive.google.com/file/d/1uRgWkF0IDSChVffa8593v5-hMxhCRplQ/view?usp=drivesdk" },
  { title: "Operation of MEWP", link: "https://drive.google.com/file/d/1G3wKCUw0bL4PWi7GC1C3_OYJ3KpJTLID/view?usp=drivesdk" },
  { title: "Operation of Side Boom", link: "https://drive.google.com/file/d/1k9XShTrx72jVh41RvB6O2EGHGCskkZt7/view?usp=drivesdk" },
  { title: "Pneumatic Hydrotesting of Pipe", link: "https://drive.google.com/file/d/1pzKiw_gXf7pBDMkpfJFhWIPs0TM2VYv7/view?usp=drivesdk" },
  { title: "Pre Commissioning Activities", link: "https://drive.google.com/file/d/1p43MDV3Udpz4kpThFue3rKOqLQ7cOv1u/view?usp=drivesdk" },
  { title: "Radiography Testing Activities", link: "https://drive.google.com/file/d/1dPUuxlB-UWw6bK5QN3DoZRi9Ku_3qgXK/view?usp=drivesdk" },
  { title: "Reinstatement and Backfilling Activities", link: "https://drive.google.com/file/d/1rVid9aLGgbSj_sOcnpOMhUtLHD0AxwCj/view?usp=drivesdk" },
  { title: "Road Crossing and Culvert Construction", link: "https://drive.google.com/file/d/1INH-uif3SCd3QylY2bp7sTl2HqE9Z_t1/view?usp=drivesdk" },
  { title: "Scaffolding Erection and Dismantling", link: "https://drive.google.com/file/d/1JYXU3ENYWZ9BF9HfCaTUTVuForzYiUXt/view?usp=drivesdk" },
  { title: "Structural Steel Erection", link: "https://drive.google.com/file/d/1Q0otf_fesdi-6rGpBlO3oOPD5mmt8xxx/view?usp=drivesdk" },
  { title: "Substation Civil Works", link: "https://drive.google.com/file/d/17zpuDsadYp6zW6J0KDkDU7LHGTkBm5A4/view?usp=drivesdk" },
  { title: "Tie-in and Hot Tap Activities", link: "https://drive.google.com/file/d/1__MYES5_npv2x6pv3ROJcymdZgkLquLm/view?usp=drivesdk" },
  { title: "Traffic Management and Flagman Duties", link: "https://drive.google.com/file/d/1bIPfM02kJri4zZlC2VUnMbYdfRrF_WA3/view?usp=drivesdk" },
  { title: "Vehicle Movement inside Plant", link: "https://drive.google.com/file/d/1Swpghi0IHWvvwkuqdowJmA1nta8l9p42/view?usp=drivesdk" },
  { title: "Welding and Fabrication Activities", link: "https://drive.google.com/file/d/1C6LFChQtQm2f4Sgkk4_fwluIF-oyr5u5/view?usp=drivesdk" }
];
