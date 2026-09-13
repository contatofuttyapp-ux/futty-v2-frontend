# Regras do R8/ProGuard para o release do Futty.
#
# 13-set — escritas quando minifyEnabled e shrinkResources foram ligados.
# O problema que elas resolvem: o Capacitor encontra os plugins por REFLEXÃO,
# lendo a anotação @CapacitorPlugin em runtime. O R8 não vê essas chamadas, dá as
# classes por não usadas e apaga. O app compila, assina, instala — e abre numa
# tela em branco, porque a ponte não acha nenhum plugin. Não há aviso nenhum na
# compilação.

# A ponte e os plugins do Capacitor.
-keep class com.getcapacitor.** { *; }
-keep @com.getcapacitor.annotation.CapacitorPlugin class * { *; }
-keep class * extends com.getcapacitor.Plugin { *; }
-keepclassmembers class * extends com.getcapacitor.Plugin {
    @com.getcapacitor.PluginMethod public <methods>;
}

# Plugins desta app (@capacitor/app e @capacitor/browser).
-keep class com.capacitorjs.plugins.** { *; }

# Plugins Cordova, que o Capacitor também carrega por reflexão.
-keep class org.apache.cordova.** { *; }

# Qualquer coisa exposta ao JavaScript do WebView tem de manter o nome: o JS
# chama pelo nome, e renomear quebra em silêncio.
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# A anotação em si tem de sobreviver, senão a busca por ela não encontra nada.
-keepattributes *Annotation*, JavascriptInterface

# Rastreio de erro legível no Sentry/Play Console. Sem isto, um crash chega como
# a.b.c(Unknown Source) e não dá para descobrir nada.
-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile
