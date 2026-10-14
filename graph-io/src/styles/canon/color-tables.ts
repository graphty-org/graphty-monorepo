/**
 * The color name tables of every dialect, as compact text read once when the module loads. Each is read into a
 * `Map`, so a name taken from a file (`constructor`, `__proto__`) is never an inherited member.
 *
 * - CSS: the CSS Color 4 named colors, as graphty-element draws them.
 * - X11: the names Graphviz 2.43 resolves in its default `x11` scheme, measured with `dot -Txdot` (`gray` is
 *   `#c0c0c0` there, not CSS's `#808080`).
 * - Brewer: the ColorBrewer schemes Graphviz knows (`/blues9/3`), measured the same way; index i is entry i - 1.
 * - dvips: the 68 CMYK color names of LaTeX's dvips driver, which Pajek uses, converted to RGB, plus the ten names
 *   Pajek adds to them (LightYellow ... LSkyBlue), as the Pajek 6.02 manual's Figure 19 (p. 105) fills their swatches.
 * - Java: the `java.awt.Color` constants Cytoscape and Gephi write.
 */

/**
 * Reads "name=rrggbb name=rrggbb ..." into a Map.
 * @param text - the table
 * @returns name to `#rrggbb`
 */
function table(text: string): ReadonlyMap<string, string> {
    const map = new Map<string, string>();
    for (const entry of text.split(" ")) {
        const eq = entry.indexOf("=");
        map.set(entry.slice(0, eq), `#${entry.slice(eq + 1)}`);
    }
    return map;
}

/** CSS named colors, lowercase. */
export const CSS_COLORS: ReadonlyMap<string, string> = table(
    "aliceblue=f0f8ff antiquewhite=faebd7 aqua=00ffff aquamarine=7fffd4 azure=f0ffff beige=f5f5dc " +
        "bisque=ffe4c4 black=000000 blanchedalmond=ffebcd blue=0000ff blueviolet=8a2be2 brown=a52a2a " +
        "burlywood=deb887 cadetblue=5f9ea0 chartreuse=7fff00 chocolate=d2691e coral=ff7f50 cornflowerblue=6495ed " +
        "cornsilk=fff8dc crimson=dc143c cyan=00ffff darkblue=00008b darkcyan=008b8b darkgoldenrod=b8860b " +
        "darkgray=a9a9a9 darkgreen=006400 darkgrey=a9a9a9 darkkhaki=bdb76b darkmagenta=8b008b " +
        "darkolivegreen=556b2f darkorange=ff8c00 darkorchid=9932cc darkred=8b0000 darksalmon=e9967a " +
        "darkseagreen=8fbc8f darkslateblue=483d8b darkslategray=2f4f4f darkslategrey=2f4f4f darkturquoise=00ced1 " +
        "darkviolet=9400d3 deeppink=ff1493 deepskyblue=00bfff dimgray=696969 dimgrey=696969 dodgerblue=1e90ff " +
        "firebrick=b22222 floralwhite=fffaf0 forestgreen=228b22 fuchsia=ff00ff gainsboro=dcdcdc ghostwhite=f8f8ff " +
        "gold=ffd700 goldenrod=daa520 gray=808080 green=008000 greenyellow=adff2f grey=808080 honeydew=f0fff0 " +
        "hotpink=ff69b4 indianred=cd5c5c indigo=4b0082 ivory=fffff0 khaki=f0e68c lavender=e6e6fa " +
        "lavenderblush=fff0f5 lawngreen=7cfc00 lemonchiffon=fffacd lightblue=add8e6 lightcoral=f08080 " +
        "lightcyan=e0ffff lightgoldenrodyellow=fafad2 lightgray=d3d3d3 lightgreen=90ee90 lightgrey=d3d3d3 " +
        "lightpink=ffb6c1 lightsalmon=ffa07a lightseagreen=20b2aa lightskyblue=87cefa lightslategray=778899 " +
        "lightslategrey=778899 lightsteelblue=b0c4de lightyellow=ffffe0 lime=00ff00 limegreen=32cd32 linen=faf0e6 " +
        "magenta=ff00ff maroon=800000 mediumaquamarine=66cdaa mediumblue=0000cd mediumorchid=ba55d3 " +
        "mediumpurple=9370db mediumseagreen=3cb371 mediumslateblue=7b68ee mediumspringgreen=00fa9a " +
        "mediumturquoise=48d1cc mediumvioletred=c71585 midnightblue=191970 mintcream=f5fffa mistyrose=ffe4e1 " +
        "moccasin=ffe4b5 navajowhite=ffdead navy=000080 oldlace=fdf5e6 olive=808000 olivedrab=6b8e23 " +
        "orange=ffa500 orangered=ff4500 orchid=da70d6 palegoldenrod=eee8aa palegreen=98fb98 paleturquoise=afeeee " +
        "palevioletred=db7093 papayawhip=ffefd5 peachpuff=ffdab9 peru=cd853f pink=ffc0cb plum=dda0dd " +
        "powderblue=b0e0e6 purple=800080 rebeccapurple=663399 red=ff0000 rosybrown=bc8f8f royalblue=4169e1 " +
        "saddlebrown=8b4513 salmon=fa8072 sandybrown=f4a460 seagreen=2e8b57 seashell=fff5ee sienna=a0522d " +
        "silver=c0c0c0 skyblue=87ceeb slateblue=6a5acd slategray=708090 slategrey=708090 snow=fffafa " +
        "springgreen=00ff7f steelblue=4682b4 tan=d2b48c teal=008080 thistle=d8bfd8 tomato=ff6347 turquoise=40e0d0 " +
        "violet=ee82ee wheat=f5deb3 white=ffffff whitesmoke=f5f5f5 yellow=ffff00 yellowgreen=9acd32",
);

/** Graphviz's X11 scheme, lowercase. */
export const X11_COLORS: ReadonlyMap<string, string> = table(
    "aliceblue=f0f8ff antiquewhite=faebd7 antiquewhite1=ffefdb antiquewhite2=eedfcc antiquewhite3=cdc0b0 " +
        "antiquewhite4=8b8378 aqua=00ffff aquamarine=7fffd4 aquamarine1=7fffd4 aquamarine2=76eec6 " +
        "aquamarine3=66cdaa aquamarine4=458b74 azure=f0ffff azure1=f0ffff azure2=e0eeee azure3=c1cdcd " +
        "azure4=838b8b beige=f5f5dc bisque=ffe4c4 bisque1=ffe4c4 bisque2=eed5b7 bisque3=cdb79e bisque4=8b7d6b " +
        "black=000000 blanchedalmond=ffebcd blue=0000ff blue1=0000ff blue2=0000ee blue3=0000cd blue4=00008b " +
        "blueviolet=8a2be2 brown=a52a2a brown1=ff4040 brown2=ee3b3b brown3=cd3333 brown4=8b2323 burlywood=deb887 " +
        "burlywood1=ffd39b burlywood2=eec591 burlywood3=cdaa7d burlywood4=8b7355 cadetblue=5f9ea0 " +
        "cadetblue1=98f5ff cadetblue2=8ee5ee cadetblue3=7ac5cd cadetblue4=53868b chartreuse=7fff00 " +
        "chartreuse1=7fff00 chartreuse2=76ee00 chartreuse3=66cd00 chartreuse4=458b00 chocolate=d2691e " +
        "chocolate1=ff7f24 chocolate2=ee7621 chocolate3=cd661d chocolate4=8b4513 coral=ff7f50 coral1=ff7256 " +
        "coral2=ee6a50 coral3=cd5b45 coral4=8b3e2f cornflowerblue=6495ed cornsilk=fff8dc cornsilk1=fff8dc " +
        "cornsilk2=eee8cd cornsilk3=cdc8b1 cornsilk4=8b8878 crimson=dc143c cyan=00ffff cyan1=00ffff cyan2=00eeee " +
        "cyan3=00cdcd cyan4=008b8b darkblue=00008b darkcyan=008b8b darkgoldenrod=b8860b darkgoldenrod1=ffb90f " +
        "darkgoldenrod2=eead0e darkgoldenrod3=cd950c darkgoldenrod4=8b6508 darkgray=a9a9a9 darkgreen=006400 " +
        "darkgrey=a9a9a9 darkkhaki=bdb76b darkmagenta=8b008b darkolivegreen=556b2f darkolivegreen1=caff70 " +
        "darkolivegreen2=bcee68 darkolivegreen3=a2cd5a darkolivegreen4=6e8b3d darkorange=ff8c00 " +
        "darkorange1=ff7f00 darkorange2=ee7600 darkorange3=cd6600 darkorange4=8b4500 darkorchid=9932cc " +
        "darkorchid1=bf3eff darkorchid2=b23aee darkorchid3=9a32cd darkorchid4=68228b darkred=8b0000 " +
        "darksalmon=e9967a darkseagreen=8fbc8f darkseagreen1=c1ffc1 darkseagreen2=b4eeb4 darkseagreen3=9bcd9b " +
        "darkseagreen4=698b69 darkslateblue=483d8b darkslategray=2f4f4f darkslategray1=97ffff " +
        "darkslategray2=8deeee darkslategray3=79cdcd darkslategray4=528b8b darkslategrey=2f4f4f " +
        "darkturquoise=00ced1 darkviolet=9400d3 deeppink=ff1493 deeppink1=ff1493 deeppink2=ee1289 " +
        "deeppink3=cd1076 deeppink4=8b0a50 deepskyblue=00bfff deepskyblue1=00bfff deepskyblue2=00b2ee " +
        "deepskyblue3=009acd deepskyblue4=00688b dimgray=696969 dimgrey=696969 dodgerblue=1e90ff " +
        "dodgerblue1=1e90ff dodgerblue2=1c86ee dodgerblue3=1874cd dodgerblue4=104e8b firebrick=b22222 " +
        "firebrick1=ff3030 firebrick2=ee2c2c firebrick3=cd2626 firebrick4=8b1a1a floralwhite=fffaf0 " +
        "forestgreen=228b22 fuchsia=ff00ff gainsboro=dcdcdc ghostwhite=f8f8ff gold=ffd700 gold1=ffd700 " +
        "gold2=eec900 gold3=cdad00 gold4=8b7500 goldenrod=daa520 goldenrod1=ffc125 goldenrod2=eeb422 " +
        "goldenrod3=cd9b1d goldenrod4=8b6914 gray=c0c0c0 gray0=000000 gray1=030303 gray10=1a1a1a gray100=ffffff " +
        "gray11=1c1c1c gray12=1f1f1f gray13=212121 gray14=242424 gray15=262626 gray16=292929 gray17=2b2b2b " +
        "gray18=2e2e2e gray19=303030 gray2=050505 gray20=333333 gray21=363636 gray22=383838 gray23=3b3b3b " +
        "gray24=3d3d3d gray25=404040 gray26=424242 gray27=454545 gray28=474747 gray29=4a4a4a gray3=080808 " +
        "gray30=4d4d4d gray31=4f4f4f gray32=525252 gray33=545454 gray34=575757 gray35=595959 gray36=5c5c5c " +
        "gray37=5e5e5e gray38=616161 gray39=636363 gray4=0a0a0a gray40=666666 gray41=696969 gray42=6b6b6b " +
        "gray43=6e6e6e gray44=707070 gray45=737373 gray46=757575 gray47=787878 gray48=7a7a7a gray49=7d7d7d " +
        "gray5=0d0d0d gray50=7f7f7f gray51=828282 gray52=858585 gray53=878787 gray54=8a8a8a gray55=8c8c8c " +
        "gray56=8f8f8f gray57=919191 gray58=949494 gray59=969696 gray6=0f0f0f gray60=999999 gray61=9c9c9c " +
        "gray62=9e9e9e gray63=a1a1a1 gray64=a3a3a3 gray65=a6a6a6 gray66=a8a8a8 gray67=ababab gray68=adadad " +
        "gray69=b0b0b0 gray7=121212 gray70=b3b3b3 gray71=b5b5b5 gray72=b8b8b8 gray73=bababa gray74=bdbdbd " +
        "gray75=bfbfbf gray76=c2c2c2 gray77=c4c4c4 gray78=c7c7c7 gray79=c9c9c9 gray8=141414 gray80=cccccc " +
        "gray81=cfcfcf gray82=d1d1d1 gray83=d4d4d4 gray84=d6d6d6 gray85=d9d9d9 gray86=dbdbdb gray87=dedede " +
        "gray88=e0e0e0 gray89=e3e3e3 gray9=171717 gray90=e5e5e5 gray91=e8e8e8 gray92=ebebeb gray93=ededed " +
        "gray94=f0f0f0 gray95=f2f2f2 gray96=f5f5f5 gray97=f7f7f7 gray98=fafafa gray99=fcfcfc green=00ff00 " +
        "green1=00ff00 green2=00ee00 green3=00cd00 green4=008b00 greenyellow=adff2f grey=c0c0c0 grey0=000000 " +
        "grey1=030303 grey10=1a1a1a grey100=ffffff grey11=1c1c1c grey12=1f1f1f grey13=212121 grey14=242424 " +
        "grey15=262626 grey16=292929 grey17=2b2b2b grey18=2e2e2e grey19=303030 grey2=050505 grey20=333333 " +
        "grey21=363636 grey22=383838 grey23=3b3b3b grey24=3d3d3d grey25=404040 grey26=424242 grey27=454545 " +
        "grey28=474747 grey29=4a4a4a grey3=080808 grey30=4d4d4d grey31=4f4f4f grey32=525252 grey33=545454 " +
        "grey34=575757 grey35=595959 grey36=5c5c5c grey37=5e5e5e grey38=616161 grey39=636363 grey4=0a0a0a " +
        "grey40=666666 grey41=696969 grey42=6b6b6b grey43=6e6e6e grey44=707070 grey45=737373 grey46=757575 " +
        "grey47=787878 grey48=7a7a7a grey49=7d7d7d grey5=0d0d0d grey50=7f7f7f grey51=828282 grey52=858585 " +
        "grey53=878787 grey54=8a8a8a grey55=8c8c8c grey56=8f8f8f grey57=919191 grey58=949494 grey59=969696 " +
        "grey6=0f0f0f grey60=999999 grey61=9c9c9c grey62=9e9e9e grey63=a1a1a1 grey64=a3a3a3 grey65=a6a6a6 " +
        "grey66=a8a8a8 grey67=ababab grey68=adadad grey69=b0b0b0 grey7=121212 grey70=b3b3b3 grey71=b5b5b5 " +
        "grey72=b8b8b8 grey73=bababa grey74=bdbdbd grey75=bfbfbf grey76=c2c2c2 grey77=c4c4c4 grey78=c7c7c7 " +
        "grey79=c9c9c9 grey8=141414 grey80=cccccc grey81=cfcfcf grey82=d1d1d1 grey83=d4d4d4 grey84=d6d6d6 " +
        "grey85=d9d9d9 grey86=dbdbdb grey87=dedede grey88=e0e0e0 grey89=e3e3e3 grey9=171717 grey90=e5e5e5 " +
        "grey91=e8e8e8 grey92=ebebeb grey93=ededed grey94=f0f0f0 grey95=f2f2f2 grey96=f5f5f5 grey97=f7f7f7 " +
        "grey98=fafafa grey99=fcfcfc honeydew=f0fff0 honeydew1=f0fff0 honeydew2=e0eee0 honeydew3=c1cdc1 " +
        "honeydew4=838b83 hotpink=ff69b4 hotpink1=ff6eb4 hotpink2=ee6aa7 hotpink3=cd6090 hotpink4=8b3a62 " +
        "indianred=cd5c5c indianred1=ff6a6a indianred2=ee6363 indianred3=cd5555 indianred4=8b3a3a indigo=4b0082 " +
        "ivory=fffff0 ivory1=fffff0 ivory2=eeeee0 ivory3=cdcdc1 ivory4=8b8b83 khaki=f0e68c khaki1=fff68f " +
        "khaki2=eee685 khaki3=cdc673 khaki4=8b864e lavender=e6e6fa lavenderblush=fff0f5 lavenderblush1=fff0f5 " +
        "lavenderblush2=eee0e5 lavenderblush3=cdc1c5 lavenderblush4=8b8386 lawngreen=7cfc00 lemonchiffon=fffacd " +
        "lemonchiffon1=fffacd lemonchiffon2=eee9bf lemonchiffon3=cdc9a5 lemonchiffon4=8b8970 lightblue=add8e6 " +
        "lightblue1=bfefff lightblue2=b2dfee lightblue3=9ac0cd lightblue4=68838b lightcoral=f08080 " +
        "lightcyan=e0ffff lightcyan1=e0ffff lightcyan2=d1eeee lightcyan3=b4cdcd lightcyan4=7a8b8b " +
        "lightgoldenrod=eedd82 lightgoldenrod1=ffec8b lightgoldenrod2=eedc82 lightgoldenrod3=cdbe70 " +
        "lightgoldenrod4=8b814c lightgoldenrodyellow=fafad2 lightgray=d3d3d3 lightgreen=90ee90 lightgrey=d3d3d3 " +
        "lightpink=ffb6c1 lightpink1=ffaeb9 lightpink2=eea2ad lightpink3=cd8c95 lightpink4=8b5f65 " +
        "lightsalmon=ffa07a lightsalmon1=ffa07a lightsalmon2=ee9572 lightsalmon3=cd8162 lightsalmon4=8b5742 " +
        "lightseagreen=20b2aa lightskyblue=87cefa lightskyblue1=b0e2ff lightskyblue2=a4d3ee lightskyblue3=8db6cd " +
        "lightskyblue4=607b8b lightslateblue=8470ff lightslategray=778899 lightslategrey=778899 " +
        "lightsteelblue=b0c4de lightsteelblue1=cae1ff lightsteelblue2=bcd2ee lightsteelblue3=a2b5cd " +
        "lightsteelblue4=6e7b8b lightyellow=ffffe0 lightyellow1=ffffe0 lightyellow2=eeeed1 lightyellow3=cdcdb4 " +
        "lightyellow4=8b8b7a lime=00ff00 limegreen=32cd32 linen=faf0e6 magenta=ff00ff magenta1=ff00ff " +
        "magenta2=ee00ee magenta3=cd00cd magenta4=8b008b maroon=b03060 maroon1=ff34b3 maroon2=ee30a7 " +
        "maroon3=cd2990 maroon4=8b1c62 mediumaquamarine=66cdaa mediumblue=0000cd mediumorchid=ba55d3 " +
        "mediumorchid1=e066ff mediumorchid2=d15fee mediumorchid3=b452cd mediumorchid4=7a378b mediumpurple=9370db " +
        "mediumpurple1=ab82ff mediumpurple2=9f79ee mediumpurple3=8968cd mediumpurple4=5d478b " +
        "mediumseagreen=3cb371 mediumslateblue=7b68ee mediumspringgreen=00fa9a mediumturquoise=48d1cc " +
        "mediumvioletred=c71585 midnightblue=191970 mintcream=f5fffa mistyrose=ffe4e1 mistyrose1=ffe4e1 " +
        "mistyrose2=eed5d2 mistyrose3=cdb7b5 mistyrose4=8b7d7b moccasin=ffe4b5 navajowhite=ffdead " +
        "navajowhite1=ffdead navajowhite2=eecfa1 navajowhite3=cdb38b navajowhite4=8b795e navy=000080 " +
        "navyblue=000080 oldlace=fdf5e6 olive=808000 olivedrab=6b8e23 olivedrab1=c0ff3e olivedrab2=b3ee3a " +
        "olivedrab3=9acd32 olivedrab4=698b22 orange=ffa500 orange1=ffa500 orange2=ee9a00 orange3=cd8500 " +
        "orange4=8b5a00 orangered=ff4500 orangered1=ff4500 orangered2=ee4000 orangered3=cd3700 orangered4=8b2500 " +
        "orchid=da70d6 orchid1=ff83fa orchid2=ee7ae9 orchid3=cd69c9 orchid4=8b4789 palegoldenrod=eee8aa " +
        "palegreen=98fb98 palegreen1=9aff9a palegreen2=90ee90 palegreen3=7ccd7c palegreen4=548b54 " +
        "paleturquoise=afeeee paleturquoise1=bbffff paleturquoise2=aeeeee paleturquoise3=96cdcd " +
        "paleturquoise4=668b8b palevioletred=db7093 palevioletred1=ff82ab palevioletred2=ee799f " +
        "palevioletred3=cd6889 palevioletred4=8b475d papayawhip=ffefd5 peachpuff=ffdab9 peachpuff1=ffdab9 " +
        "peachpuff2=eecbad peachpuff3=cdaf95 peachpuff4=8b7765 peru=cd853f pink=ffc0cb pink1=ffb5c5 pink2=eea9b8 " +
        "pink3=cd919e pink4=8b636c plum=dda0dd plum1=ffbbff plum2=eeaeee plum3=cd96cd plum4=8b668b " +
        "powderblue=b0e0e6 purple=a020f0 purple1=9b30ff purple2=912cee purple3=7d26cd purple4=551a8b " +
        "rebeccapurple=663399 red=ff0000 red1=ff0000 red2=ee0000 red3=cd0000 red4=8b0000 rosybrown=bc8f8f " +
        "rosybrown1=ffc1c1 rosybrown2=eeb4b4 rosybrown3=cd9b9b rosybrown4=8b6969 royalblue=4169e1 " +
        "royalblue1=4876ff royalblue2=436eee royalblue3=3a5fcd royalblue4=27408b saddlebrown=8b4513 salmon=fa8072 " +
        "salmon1=ff8c69 salmon2=ee8262 salmon3=cd7054 salmon4=8b4c39 sandybrown=f4a460 seagreen=2e8b57 " +
        "seagreen1=54ff9f seagreen2=4eee94 seagreen3=43cd80 seagreen4=2e8b57 seashell=fff5ee seashell1=fff5ee " +
        "seashell2=eee5de seashell3=cdc5bf seashell4=8b8682 sienna=a0522d sienna1=ff8247 sienna2=ee7942 " +
        "sienna3=cd6839 sienna4=8b4726 silver=c0c0c0 skyblue=87ceeb skyblue1=87ceff skyblue2=7ec0ee " +
        "skyblue3=6ca6cd skyblue4=4a708b slateblue=6a5acd slateblue1=836fff slateblue2=7a67ee slateblue3=6959cd " +
        "slateblue4=473c8b slategray=708090 slategray1=c6e2ff slategray2=b9d3ee slategray3=9fb6cd " +
        "slategray4=6c7b8b slategrey=708090 snow=fffafa snow1=fffafa snow2=eee9e9 snow3=cdc9c9 snow4=8b8989 " +
        "springgreen=00ff7f springgreen1=00ff7f springgreen2=00ee76 springgreen3=00cd66 springgreen4=008b45 " +
        "steelblue=4682b4 steelblue1=63b8ff steelblue2=5cacee steelblue3=4f94cd steelblue4=36648b tan=d2b48c " +
        "tan1=ffa54f tan2=ee9a49 tan3=cd853f tan4=8b5a2b teal=008080 thistle=d8bfd8 thistle1=ffe1ff " +
        "thistle2=eed2ee thistle3=cdb5cd thistle4=8b7b8b tomato=ff6347 tomato1=ff6347 tomato2=ee5c42 " +
        "tomato3=cd4f39 tomato4=8b3626 turquoise=40e0d0 turquoise1=00f5ff turquoise2=00e5ee turquoise3=00c5cd " +
        "turquoise4=00868b violet=ee82ee violetred=d02090 violetred1=ff3e96 violetred2=ee3a8c violetred3=cd3278 " +
        "violetred4=8b2252 wheat=f5deb3 wheat1=ffe7ba wheat2=eed8ae wheat3=cdba96 wheat4=8b7e66 white=ffffff " +
        "whitesmoke=f5f5f5 yellow=ffff00 yellow1=ffff00 yellow2=eeee00 yellow3=cdcd00 yellow4=8b8b00 " +
        "yellowgreen=9acd32",
);

/** dvips names, case as Pajek spells them. */
export const DVIPS_COLORS: ReadonlyMap<string, string> = table(
    "GreenYellow=d9ff4f Yellow=ffff00 Goldenrod=ffe629 Dandelion=ffb529 Apricot=ffad7a Peach=ff804d " +
        "Melon=ff8a80 YellowOrange=ff9400 Orange=ff6321 BurntOrange=ff7d00 Bittersweet=c20300 RedOrange=ff3b21 " +
        "Mahogany=a60000 Maroon=ad0000 BrickRed=b80000 Red=ff0000 OrangeRed=ff0080 RubineRed=ff00de " +
        "WildStrawberry=ff0a9c Salmon=ff789e CarnationPink=ff5eff Magenta=ff00ff VioletRed=ff30ff " +
        "Rhodamine=ff2eff Mulberry=a314fa RedViolet=9600a8 Fuchsia=7303eb Lavender=ff85ff Thistle=e069ff " +
        "Orchid=ad5cff DarkOrchid=9933cc Purple=8c24ff Plum=8000ff Violet=361fff RoyalPurple=4019ff " +
        "BlueViolet=190df5 Periwinkle=6e73ff CadetBlue=616ec4 CornflowerBlue=59deff MidnightBlue=007091 " +
        "NavyBlue=0f75ff RoyalBlue=0080ff Blue=0000ff Cerulean=0fe3ff Cyan=00ffff ProcessBlue=0affff " +
        "SkyBlue=61ffe0 Turquoise=26ffcc TealBlue=1ffaa3 Aquamarine=2effb2 BlueGreen=26ffab Emerald=00ff80 " +
        "JungleGreen=03ff7a SeaGreen=4fff80 Green=00ff00 ForestGreen=00e000 PineGreen=00bf29 LimeGreen=80ff00 " +
        "YellowGreen=8fff42 SpringGreen=bdff3d OliveGreen=009900 RawSienna=8c0000 Sepia=4d0000 Brown=660000 " +
        "Tan=db9470 Gray=808080 Black=000000 White=ffffff " +
        // Pajek's own names, not in dvips: the RGB fill of each swatch in the Pajek 6.02 manual, Figure 19, p. 105
        // (http://mrvar.fdv.uni-lj.si/pajek/pajekman.pdf); Pajek's SVG export draws LightCyan as rgb(204,255,255) too.
        "LightYellow=ffff99 LightCyan=ccffff LightMagenta=ffccff LightPurple=ccccff LightGreen=ccffb3 " +
        "LightOrange=ffccb3 Canary=ffff7f LFadedGreen=e6ffcc Pink=ffd9f3 LSkyBlue=d9f3ff",
);

/** Java's `java.awt.Color` constants, lowercase, with and without the underscore. */
export const JAVA_COLORS: ReadonlyMap<string, string> = table(
    "black=000000 blue=0000ff cyan=00ffff darkgray=404040 dark_gray=404040 gray=808080 green=00ff00 " +
        "lightgray=c0c0c0 light_gray=c0c0c0 magenta=ff00ff orange=ffc800 pink=ffafaf red=ff0000 white=ffffff yellow=ffff00",
);

/** Graphviz's Brewer schemes: scheme name to its colors, entry i - 1 for index i. */
export const BREWER_SCHEMES: ReadonlyMap<string, readonly string[]> = new Map(
    (
        "accent3=7fc97f,beaed4,fdc086 accent4=7fc97f,beaed4,fdc086,ffff99 " +
        "accent5=7fc97f,beaed4,fdc086,ffff99,386cb0 accent6=7fc97f,beaed4,fdc086,ffff99,386cb0,f0027f " +
        "accent7=7fc97f,beaed4,fdc086,ffff99,386cb0,f0027f,bf5b17 " +
        "accent8=7fc97f,beaed4,fdc086,ffff99,386cb0,f0027f,bf5b17,666666 blues3=deebf7,9ecae1,3182bd " +
        "blues4=eff3ff,bdd7e7,6baed6,2171b5 blues5=eff3ff,bdd7e7,6baed6,3182bd,08519c " +
        "blues6=eff3ff,c6dbef,9ecae1,6baed6,3182bd,08519c blues7=eff3ff,c6dbef,9ecae1,6baed6,4292c6,2171b5,084594 " +
        "blues8=f7fbff,deebf7,c6dbef,9ecae1,6baed6,4292c6,2171b5,084594 " +
        "blues9=f7fbff,deebf7,c6dbef,9ecae1,6baed6,4292c6,2171b5,08519c,08306b " +
        "brbg10=543005,8c510a,bf812d,dfc27d,f6e8c3,c7eae5,80cdc1,35978f,01665e,003c30 " +
        "brbg11=543005,8c510a,bf812d,dfc27d,f6e8c3,f5f5f5,c7eae5,80cdc1,35978f,01665e,003c30 " +
        "brbg3=d8b365,f5f5f5,5ab4ac brbg4=a6611a,dfc27d,80cdc1,018571 brbg5=a6611a,dfc27d,f5f5f5,80cdc1,018571 " +
        "brbg6=8c510a,d8b365,f6e8c3,c7eae5,5ab4ac,01665e brbg7=8c510a,d8b365,f6e8c3,f5f5f5,c7eae5,5ab4ac,01665e " +
        "brbg8=8c510a,bf812d,dfc27d,f6e8c3,c7eae5,80cdc1,35978f,01665e " +
        "brbg9=8c510a,bf812d,dfc27d,f6e8c3,f5f5f5,c7eae5,80cdc1,35978f,01665e bugn3=e5f5f9,99d8c9,2ca25f " +
        "bugn4=edf8fb,b2e2e2,66c2a4,238b45 bugn5=edf8fb,b2e2e2,66c2a4,2ca25f,006d2c " +
        "bugn6=edf8fb,ccece6,99d8c9,66c2a4,2ca25f,006d2c bugn7=edf8fb,ccece6,99d8c9,66c2a4,41ae76,238b45,005824 " +
        "bugn8=f7fcfd,e5f5f9,ccece6,99d8c9,66c2a4,41ae76,238b45,005824 " +
        "bugn9=f7fcfd,e5f5f9,ccece6,99d8c9,66c2a4,41ae76,238b45,006d2c,00441b bupu3=e0ecf4,9ebcda,8856a7 " +
        "bupu4=edf8fb,b3cde3,8c96c6,88419d bupu5=edf8fb,b3cde3,8c96c6,8856a7,810f7c " +
        "bupu6=edf8fb,bfd3e6,9ebcda,8c96c6,8856a7,810f7c bupu7=edf8fb,bfd3e6,9ebcda,8c96c6,8c6bb1,88419d,6e016b " +
        "bupu8=f7fcfd,e0ecf4,bfd3e6,9ebcda,8c96c6,8c6bb1,88419d,6e016b " +
        "bupu9=f7fcfd,e0ecf4,bfd3e6,9ebcda,8c96c6,8c6bb1,88419d,810f7c,4d004b dark23=1b9e77,d95f02,7570b3 " +
        "dark24=1b9e77,d95f02,7570b3,e7298a dark25=1b9e77,d95f02,7570b3,e7298a,66a61e " +
        "dark26=1b9e77,d95f02,7570b3,e7298a,66a61e,e6ab02 dark27=1b9e77,d95f02,7570b3,e7298a,66a61e,e6ab02,a6761d " +
        "dark28=1b9e77,d95f02,7570b3,e7298a,66a61e,e6ab02,a6761d,666666 gnbu3=e0f3db,a8ddb5,43a2ca " +
        "gnbu4=f0f9e8,bae4bc,7bccc4,2b8cbe gnbu5=f0f9e8,bae4bc,7bccc4,43a2ca,0868ac " +
        "gnbu6=f0f9e8,ccebc5,a8ddb5,7bccc4,43a2ca,0868ac gnbu7=f0f9e8,ccebc5,a8ddb5,7bccc4,4eb3d3,2b8cbe,08589e " +
        "gnbu8=f7fcf0,e0f3db,ccebc5,a8ddb5,7bccc4,4eb3d3,2b8cbe,08589e " +
        "gnbu9=f7fcf0,e0f3db,ccebc5,a8ddb5,7bccc4,4eb3d3,2b8cbe,0868ac,084081 greens3=e5f5e0,a1d99b,31a354 " +
        "greens4=edf8e9,bae4b3,74c476,238b45 greens5=edf8e9,bae4b3,74c476,31a354,006d2c " +
        "greens6=edf8e9,c7e9c0,a1d99b,74c476,31a354,006d2c " +
        "greens7=edf8e9,c7e9c0,a1d99b,74c476,41ab5d,238b45,005a32 " +
        "greens8=f7fcf5,e5f5e0,c7e9c0,a1d99b,74c476,41ab5d,238b45,005a32 " +
        "greens9=f7fcf5,e5f5e0,c7e9c0,a1d99b,74c476,41ab5d,238b45,006d2c,00441b greys3=f0f0f0,bdbdbd,636363 " +
        "greys4=f7f7f7,cccccc,969696,525252 greys5=f7f7f7,cccccc,969696,636363,252525 " +
        "greys6=f7f7f7,d9d9d9,bdbdbd,969696,636363,252525 greys7=f7f7f7,d9d9d9,bdbdbd,969696,737373,525252,252525 " +
        "greys8=ffffff,f0f0f0,d9d9d9,bdbdbd,969696,737373,525252,252525 " +
        "greys9=ffffff,f0f0f0,d9d9d9,bdbdbd,969696,737373,525252,252525,000000 oranges3=fee6ce,fdae6b,e6550d " +
        "oranges4=feedde,fdbe85,fd8d3c,d94701 oranges5=feedde,fdbe85,fd8d3c,e6550d,a63603 " +
        "oranges6=feedde,fdd0a2,fdae6b,fd8d3c,e6550d,a63603 " +
        "oranges7=feedde,fdd0a2,fdae6b,fd8d3c,f16913,d94801,8c2d04 " +
        "oranges8=fff5eb,fee6ce,fdd0a2,fdae6b,fd8d3c,f16913,d94801,8c2d04 " +
        "oranges9=fff5eb,fee6ce,fdd0a2,fdae6b,fd8d3c,f16913,d94801,a63603,7f2704 orrd3=fee8c8,fdbb84,e34a33 " +
        "orrd4=fef0d9,fdcc8a,fc8d59,d7301f orrd5=fef0d9,fdcc8a,fc8d59,e34a33,b30000 " +
        "orrd6=fef0d9,fdd49e,fdbb84,fc8d59,e34a33,b30000 orrd7=fef0d9,fdd49e,fdbb84,fc8d59,ef6548,d7301f,990000 " +
        "orrd8=fff7ec,fee8c8,fdd49e,fdbb84,fc8d59,ef6548,d7301f,990000 " +
        "orrd9=fff7ec,fee8c8,fdd49e,fdbb84,fc8d59,ef6548,d7301f,b30000,7f0000 " +
        "paired10=a6cee3,1f78b4,b2df8a,33a02c,fb9a99,e31a1c,fdbf6f,ff7f00,cab2d6,6a3d9a " +
        "paired11=a6cee3,1f78b4,b2df8a,33a02c,fb9a99,e31a1c,fdbf6f,ff7f00,cab2d6,6a3d9a,ffff99 " +
        "paired12=a6cee3,1f78b4,b2df8a,33a02c,fb9a99,e31a1c,fdbf6f,ff7f00,cab2d6,6a3d9a,ffff99,b15928 " +
        "paired3=a6cee3,1f78b4,b2df8a paired4=a6cee3,1f78b4,b2df8a,33a02c " +
        "paired5=a6cee3,1f78b4,b2df8a,33a02c,fb9a99 paired6=a6cee3,1f78b4,b2df8a,33a02c,fb9a99,e31a1c " +
        "paired7=a6cee3,1f78b4,b2df8a,33a02c,fb9a99,e31a1c,fdbf6f " +
        "paired8=a6cee3,1f78b4,b2df8a,33a02c,fb9a99,e31a1c,fdbf6f,ff7f00 " +
        "paired9=a6cee3,1f78b4,b2df8a,33a02c,fb9a99,e31a1c,fdbf6f,ff7f00,cab2d6 pastel13=fbb4ae,b3cde3,ccebc5 " +
        "pastel14=fbb4ae,b3cde3,ccebc5,decbe4 pastel15=fbb4ae,b3cde3,ccebc5,decbe4,fed9a6 " +
        "pastel16=fbb4ae,b3cde3,ccebc5,decbe4,fed9a6,ffffcc " +
        "pastel17=fbb4ae,b3cde3,ccebc5,decbe4,fed9a6,ffffcc,e5d8bd " +
        "pastel18=fbb4ae,b3cde3,ccebc5,decbe4,fed9a6,ffffcc,e5d8bd,fddaec " +
        "pastel19=fbb4ae,b3cde3,ccebc5,decbe4,fed9a6,ffffcc,e5d8bd,fddaec,f2f2f2 pastel23=b3e2cd,fdcdac,cbd5e8 " +
        "pastel24=b3e2cd,fdcdac,cbd5e8,f4cae4 pastel25=b3e2cd,fdcdac,cbd5e8,f4cae4,e6f5c9 " +
        "pastel26=b3e2cd,fdcdac,cbd5e8,f4cae4,e6f5c9,fff2ae " +
        "pastel27=b3e2cd,fdcdac,cbd5e8,f4cae4,e6f5c9,fff2ae,f1e2cc " +
        "pastel28=b3e2cd,fdcdac,cbd5e8,f4cae4,e6f5c9,fff2ae,f1e2cc,cccccc " +
        "piyg10=8e0152,c51b7d,de77ae,f1b6da,fde0ef,e6f5d0,b8e186,7fbc41,4d9221,276419 " +
        "piyg11=8e0152,c51b7d,de77ae,f1b6da,fde0ef,f7f7f7,e6f5d0,b8e186,7fbc41,4d9221,276419 " +
        "piyg3=e9a3c9,f7f7f7,a1d76a piyg4=d01c8b,f1b6da,b8e186,4dac26 piyg5=d01c8b,f1b6da,f7f7f7,b8e186,4dac26 " +
        "piyg6=c51b7d,e9a3c9,fde0ef,e6f5d0,a1d76a,4d9221 piyg7=c51b7d,e9a3c9,fde0ef,f7f7f7,e6f5d0,a1d76a,4d9221 " +
        "piyg8=c51b7d,de77ae,f1b6da,fde0ef,e6f5d0,b8e186,7fbc41,4d9221 " +
        "piyg9=c51b7d,de77ae,f1b6da,fde0ef,f7f7f7,e6f5d0,b8e186,7fbc41,4d9221 " +
        "prgn10=40004b,762a83,9970ab,c2a5cf,e7d4e8,d9f0d3,a6dba0,5aae61,1b7837,00441b " +
        "prgn11=40004b,762a83,9970ab,c2a5cf,e7d4e8,f7f7f7,d9f0d3,a6dba0,5aae61,1b7837,00441b " +
        "prgn3=af8dc3,f7f7f7,7fbf7b prgn4=7b3294,c2a5cf,a6dba0,008837 prgn5=7b3294,c2a5cf,f7f7f7,a6dba0,008837 " +
        "prgn6=762a83,af8dc3,e7d4e8,d9f0d3,7fbf7b,1b7837 prgn7=762a83,af8dc3,e7d4e8,f7f7f7,d9f0d3,7fbf7b,1b7837 " +
        "prgn8=762a83,9970ab,c2a5cf,e7d4e8,d9f0d3,a6dba0,5aae61,1b7837 " +
        "prgn9=762a83,9970ab,c2a5cf,e7d4e8,f7f7f7,d9f0d3,a6dba0,5aae61,1b7837 pubu3=ece7f2,a6bddb,2b8cbe " +
        "pubu4=f1eef6,bdc9e1,74a9cf,0570b0 pubu5=f1eef6,bdc9e1,74a9cf,2b8cbe,045a8d " +
        "pubu6=f1eef6,d0d1e6,a6bddb,74a9cf,2b8cbe,045a8d pubu7=f1eef6,d0d1e6,a6bddb,74a9cf,3690c0,0570b0,034e7b " +
        "pubu8=fff7fb,ece7f2,d0d1e6,a6bddb,74a9cf,3690c0,0570b0,034e7b " +
        "pubu9=fff7fb,ece7f2,d0d1e6,a6bddb,74a9cf,3690c0,0570b0,045a8d,023858 pubugn3=ece2f0,a6bddb,1c9099 " +
        "pubugn4=f6eff7,bdc9e1,67a9cf,02818a pubugn5=f6eff7,bdc9e1,67a9cf,1c9099,016c59 " +
        "pubugn6=f6eff7,d0d1e6,a6bddb,67a9cf,1c9099,016c59 " +
        "pubugn7=f6eff7,d0d1e6,a6bddb,67a9cf,3690c0,02818a,016450 " +
        "pubugn8=fff7fb,ece2f0,d0d1e6,a6bddb,67a9cf,3690c0,02818a,016450 " +
        "pubugn9=fff7fb,ece2f0,d0d1e6,a6bddb,67a9cf,3690c0,02818a,016c59,014636 " +
        "puor10=7f3b08,b35806,e08214,fdb863,fee0b6,d8daeb,b2abd2,8073ac,542788,2d004b " +
        "puor11=7f3b08,b35806,e08214,fdb863,fee0b6,f7f7f7,d8daeb,b2abd2,8073ac,542788,2d004b " +
        "puor3=f1a340,f7f7f7,998ec3 puor4=e66101,fdb863,b2abd2,5e3c99 puor5=e66101,fdb863,f7f7f7,b2abd2,5e3c99 " +
        "puor6=b35806,f1a340,fee0b6,d8daeb,998ec3,542788 puor7=b35806,f1a340,fee0b6,f7f7f7,d8daeb,998ec3,542788 " +
        "puor8=b35806,e08214,fdb863,fee0b6,d8daeb,b2abd2,8073ac,542788 " +
        "puor9=b35806,e08214,fdb863,fee0b6,f7f7f7,d8daeb,b2abd2,8073ac,542788 purd3=e7e1ef,c994c7,dd1c77 " +
        "purd4=f1eef6,d7b5d8,df65b0,ce1256 purd5=f1eef6,d7b5d8,df65b0,dd1c77,980043 " +
        "purd6=f1eef6,d4b9da,c994c7,df65b0,dd1c77,980043 purd7=f1eef6,d4b9da,c994c7,df65b0,e7298a,ce1256,91003f " +
        "purd8=f7f4f9,e7e1ef,d4b9da,c994c7,df65b0,e7298a,ce1256,91003f " +
        "purd9=f7f4f9,e7e1ef,d4b9da,c994c7,df65b0,e7298a,ce1256,980043,67001f purples3=efedf5,bcbddc,756bb1 " +
        "purples4=f2f0f7,cbc9e2,9e9ac8,6a51a3 purples5=f2f0f7,cbc9e2,9e9ac8,756bb1,54278f " +
        "purples6=f2f0f7,dadaeb,bcbddc,9e9ac8,756bb1,54278f " +
        "purples7=f2f0f7,dadaeb,bcbddc,9e9ac8,807dba,6a51a3,4a1486 " +
        "purples8=fcfbfd,efedf5,dadaeb,bcbddc,9e9ac8,807dba,6a51a3,4a1486 " +
        "purples9=fcfbfd,efedf5,dadaeb,bcbddc,9e9ac8,807dba,6a51a3,54278f,3f007d " +
        "rdbu10=67001f,b2182b,d6604d,f4a582,fddbc7,d1e5f0,92c5de,4393c3,2166ac,053061 " +
        "rdbu11=67001f,b2182b,d6604d,f4a582,fddbc7,f7f7f7,d1e5f0,92c5de,4393c3,2166ac,053061 " +
        "rdbu3=ef8a62,f7f7f7,67a9cf rdbu4=ca0020,f4a582,92c5de,0571b0 rdbu5=ca0020,f4a582,f7f7f7,92c5de,0571b0 " +
        "rdbu6=b2182b,ef8a62,fddbc7,d1e5f0,67a9cf,2166ac rdbu7=b2182b,ef8a62,fddbc7,f7f7f7,d1e5f0,67a9cf,2166ac " +
        "rdbu8=b2182b,d6604d,f4a582,fddbc7,d1e5f0,92c5de,4393c3,2166ac " +
        "rdbu9=b2182b,d6604d,f4a582,fddbc7,f7f7f7,d1e5f0,92c5de,4393c3,2166ac " +
        "rdgy10=67001f,b2182b,d6604d,f4a582,fddbc7,e0e0e0,bababa,878787,4d4d4d,1a1a1a " +
        "rdgy11=67001f,b2182b,d6604d,f4a582,fddbc7,ffffff,e0e0e0,bababa,878787,4d4d4d,1a1a1a " +
        "rdgy3=ef8a62,ffffff,999999 rdgy4=ca0020,f4a582,bababa,404040 rdgy5=ca0020,f4a582,ffffff,bababa,404040 " +
        "rdgy6=b2182b,ef8a62,fddbc7,e0e0e0,999999,4d4d4d rdgy7=b2182b,ef8a62,fddbc7,ffffff,e0e0e0,999999,4d4d4d " +
        "rdgy8=b2182b,d6604d,f4a582,fddbc7,e0e0e0,bababa,878787,4d4d4d " +
        "rdgy9=b2182b,d6604d,f4a582,fddbc7,ffffff,e0e0e0,bababa,878787,4d4d4d rdpu3=fde0dd,fa9fb5,c51b8a " +
        "rdpu4=feebe2,fbb4b9,f768a1,ae017e rdpu5=feebe2,fbb4b9,f768a1,c51b8a,7a0177 " +
        "rdpu6=feebe2,fcc5c0,fa9fb5,f768a1,c51b8a,7a0177 rdpu7=feebe2,fcc5c0,fa9fb5,f768a1,dd3497,ae017e,7a0177 " +
        "rdpu8=fff7f3,fde0dd,fcc5c0,fa9fb5,f768a1,dd3497,ae017e,7a0177 " +
        "rdpu9=fff7f3,fde0dd,fcc5c0,fa9fb5,f768a1,dd3497,ae017e,7a0177,49006a " +
        "rdylbu10=a50026,d73027,f46d43,fdae61,fee090,e0f3f8,abd9e9,74add1,4575b4,313695 " +
        "rdylbu11=a50026,d73027,f46d43,fdae61,fee090,ffffbf,e0f3f8,abd9e9,74add1,4575b4,313695 " +
        "rdylbu3=fc8d59,ffffbf,91bfdb rdylbu4=d7191c,fdae61,abd9e9,2c7bb6 " +
        "rdylbu5=d7191c,fdae61,ffffbf,abd9e9,2c7bb6 rdylbu6=d73027,fc8d59,fee090,e0f3f8,91bfdb,4575b4 " +
        "rdylbu7=d73027,fc8d59,fee090,ffffbf,e0f3f8,91bfdb,4575b4 " +
        "rdylbu8=d73027,f46d43,fdae61,fee090,e0f3f8,abd9e9,74add1,4575b4 " +
        "rdylbu9=d73027,f46d43,fdae61,fee090,ffffbf,e0f3f8,abd9e9,74add1,4575b4 " +
        "rdylgn10=a50026,d73027,f46d43,fdae61,fee08b,d9ef8b,a6d96a,66bd63,1a9850,006837 " +
        "rdylgn11=a50026,d73027,f46d43,fdae61,fee08b,ffffbf,d9ef8b,a6d96a,66bd63,1a9850,006837 " +
        "rdylgn3=fc8d59,ffffbf,91cf60 rdylgn4=d7191c,fdae61,a6d96a,1a9641 " +
        "rdylgn5=d7191c,fdae61,ffffbf,a6d96a,1a9641 rdylgn6=d73027,fc8d59,fee08b,d9ef8b,91cf60,1a9850 " +
        "rdylgn7=d73027,fc8d59,fee08b,ffffbf,d9ef8b,91cf60,1a9850 " +
        "rdylgn8=d73027,f46d43,fdae61,fee08b,d9ef8b,a6d96a,66bd63,1a9850 " +
        "rdylgn9=d73027,f46d43,fdae61,fee08b,ffffbf,d9ef8b,a6d96a,66bd63,1a9850 reds3=fee0d2,fc9272,de2d26 " +
        "reds4=fee5d9,fcae91,fb6a4a,cb181d reds5=fee5d9,fcae91,fb6a4a,de2d26,a50f15 " +
        "reds6=fee5d9,fcbba1,fc9272,fb6a4a,de2d26,a50f15 reds7=fee5d9,fcbba1,fc9272,fb6a4a,ef3b2c,cb181d,99000d " +
        "reds8=fff5f0,fee0d2,fcbba1,fc9272,fb6a4a,ef3b2c,cb181d,99000d " +
        "reds9=fff5f0,fee0d2,fcbba1,fc9272,fb6a4a,ef3b2c,cb181d,a50f15,67000d set13=e41a1c,377eb8,4daf4a " +
        "set14=e41a1c,377eb8,4daf4a,984ea3 set15=e41a1c,377eb8,4daf4a,984ea3,ff7f00 " +
        "set16=e41a1c,377eb8,4daf4a,984ea3,ff7f00,ffff33 set17=e41a1c,377eb8,4daf4a,984ea3,ff7f00,ffff33,a65628 " +
        "set18=e41a1c,377eb8,4daf4a,984ea3,ff7f00,ffff33,a65628,f781bf " +
        "set19=e41a1c,377eb8,4daf4a,984ea3,ff7f00,ffff33,a65628,f781bf,999999 set23=66c2a5,fc8d62,8da0cb " +
        "set24=66c2a5,fc8d62,8da0cb,e78ac3 set25=66c2a5,fc8d62,8da0cb,e78ac3,a6d854 " +
        "set26=66c2a5,fc8d62,8da0cb,e78ac3,a6d854,ffd92f set27=66c2a5,fc8d62,8da0cb,e78ac3,a6d854,ffd92f,e5c494 " +
        "set28=66c2a5,fc8d62,8da0cb,e78ac3,a6d854,ffd92f,e5c494,b3b3b3 " +
        "set310=8dd3c7,ffffb3,bebada,fb8072,80b1d3,fdb462,b3de69,fccde5,d9d9d9,bc80bd " +
        "set311=8dd3c7,ffffb3,bebada,fb8072,80b1d3,fdb462,b3de69,fccde5,d9d9d9,bc80bd,ccebc5 " +
        "set312=8dd3c7,ffffb3,bebada,fb8072,80b1d3,fdb462,b3de69,fccde5,d9d9d9,bc80bd,ccebc5,ffed6f " +
        "set33=8dd3c7,ffffb3,bebada set34=8dd3c7,ffffb3,bebada,fb8072 set35=8dd3c7,ffffb3,bebada,fb8072,80b1d3 " +
        "set36=8dd3c7,ffffb3,bebada,fb8072,80b1d3,fdb462 set37=8dd3c7,ffffb3,bebada,fb8072,80b1d3,fdb462,b3de69 " +
        "set38=8dd3c7,ffffb3,bebada,fb8072,80b1d3,fdb462,b3de69,fccde5 " +
        "set39=8dd3c7,ffffb3,bebada,fb8072,80b1d3,fdb462,b3de69,fccde5,d9d9d9 " +
        "spectral10=9e0142,d53e4f,f46d43,fdae61,fee08b,e6f598,abdda4,66c2a5,3288bd,5e4fa2 " +
        "spectral11=9e0142,d53e4f,f46d43,fdae61,fee08b,ffffbf,e6f598,abdda4,66c2a5,3288bd,5e4fa2 " +
        "spectral3=fc8d59,ffffbf,99d594 spectral4=d7191c,fdae61,abdda4,2b83ba " +
        "spectral5=d7191c,fdae61,ffffbf,abdda4,2b83ba spectral6=d53e4f,fc8d59,fee08b,e6f598,99d594,3288bd " +
        "spectral7=d53e4f,fc8d59,fee08b,ffffbf,e6f598,99d594,3288bd " +
        "spectral8=d53e4f,f46d43,fdae61,fee08b,e6f598,abdda4,66c2a5,3288bd " +
        "spectral9=d53e4f,f46d43,fdae61,fee08b,ffffbf,e6f598,abdda4,66c2a5,3288bd ylgn3=f7fcb9,addd8e,31a354 " +
        "ylgn4=ffffcc,c2e699,78c679,238443 ylgn5=ffffcc,c2e699,78c679,31a354,006837 " +
        "ylgn6=ffffcc,d9f0a3,addd8e,78c679,31a354,006837 ylgn7=ffffcc,d9f0a3,addd8e,78c679,41ab5d,238443,005a32 " +
        "ylgn8=ffffe5,f7fcb9,d9f0a3,addd8e,78c679,41ab5d,238443,005a32 " +
        "ylgn9=ffffe5,f7fcb9,d9f0a3,addd8e,78c679,41ab5d,238443,006837,004529 ylgnbu3=edf8b1,7fcdbb,2c7fb8 " +
        "ylgnbu4=ffffcc,a1dab4,41b6c4,225ea8 ylgnbu5=ffffcc,a1dab4,41b6c4,2c7fb8,253494 " +
        "ylgnbu6=ffffcc,c7e9b4,7fcdbb,41b6c4,2c7fb8,253494 " +
        "ylgnbu7=ffffcc,c7e9b4,7fcdbb,41b6c4,1d91c0,225ea8,0c2c84 " +
        "ylgnbu8=ffffd9,edf8b1,c7e9b4,7fcdbb,41b6c4,1d91c0,225ea8,0c2c84 " +
        "ylgnbu9=ffffd9,edf8b1,c7e9b4,7fcdbb,41b6c4,1d91c0,225ea8,253494,081d58 ylorbr3=fff7bc,fec44f,d95f0e " +
        "ylorbr4=ffffd4,fed98e,fe9929,cc4c02 ylorbr5=ffffd4,fed98e,fe9929,d95f0e,993404 " +
        "ylorbr6=ffffd4,fee391,fec44f,fe9929,d95f0e,993404 " +
        "ylorbr7=ffffd4,fee391,fec44f,fe9929,ec7014,cc4c02,8c2d04 " +
        "ylorbr8=ffffe5,fff7bc,fee391,fec44f,fe9929,ec7014,cc4c02,8c2d04 " +
        "ylorbr9=ffffe5,fff7bc,fee391,fec44f,fe9929,ec7014,cc4c02,993404,662506 ylorrd3=ffeda0,feb24c,f03b20 " +
        "ylorrd4=ffffb2,fecc5c,fd8d3c,e31a1c ylorrd5=ffffb2,fecc5c,fd8d3c,f03b20,bd0026 " +
        "ylorrd6=ffffb2,fed976,feb24c,fd8d3c,f03b20,bd0026 " +
        "ylorrd7=ffffb2,fed976,feb24c,fd8d3c,fc4e2a,e31a1c,b10026 " +
        "ylorrd8=ffffcc,ffeda0,fed976,feb24c,fd8d3c,fc4e2a,e31a1c,b10026 " +
        "ylorrd9=ffffcc,ffeda0,fed976,feb24c,fd8d3c,fc4e2a,e31a1c,bd0026,800026"
    )
        .split(" ")
        .map((entry): [string, readonly string[]] => {
            const eq = entry.indexOf("=");
            return [
                entry.slice(0, eq),
                entry
                    .slice(eq + 1)
                    .split(",")
                    .map((h) => `#${h}`),
            ];
        }),
);
