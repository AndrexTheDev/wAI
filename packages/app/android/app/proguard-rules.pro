# wAI – release shrinker rules
# Capacitor bridge + plugins are reflected by name from JS, so keep them intact.
-keep class com.getcapacitor.** { *; }
-keep @com.getcapacitor.annotation.CapacitorPlugin class * { *; }
-keep class dev.andrexthedev.wai.** { *; }
-keepclassmembers class * {
    @com.getcapacitor.PluginMethod public <methods>;
}
-keepclassmembers class * extends com.getcapacitor.Plugin {
    public <methods>;
}
-keep class com.capacitorjs.plugins.** { *; }

# Keep annotations & generic signatures used by the bridge
-keepattributes Signature, *Annotation*, EnclosingMethod, InnerClasses

# AndroidX WebKit
-dontwarn androidx.webkit.**

# Suppress harmless warnings from optional Jetpack Compose/Kotlin references
-dontwarn org.jetbrains.annotations.**
