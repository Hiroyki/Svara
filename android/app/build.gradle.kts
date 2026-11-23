// APK Svara buat Android: UI web yang sama, server.py jalan di dalam app lewat Chaquopy (Python 3.12 + yt-dlp).
// Build: ../build-android.sh  (atau: ./gradlew assembleRelease)
plugins {
    id("com.android.application")
    id("com.chaquo.python")
}

val svaraVersion = "2.0.0"
val repoRoot = rootProject.projectDir.parentFile

android {
    namespace = "site.faquloh.svara"
    compileSdk = 36

    defaultConfig {
        applicationId = "site.faquloh.svara"
        minSdk = 24
        targetSdk = 36
        versionCode = 20000
        versionName = svaraVersion
        // Cuma arm64 (semua HP Android modern); Python 3.12 di Chaquopy nggak ada versi ARM 32-bit.
        // x86_64 cuma buat emulator, jadi nggak ikut di APK rilis biar lebih kecil. Nyalain pakai:
        // ./gradlew assembleRelease -Psvara.abis=arm64-v8a,x86_64
        val abis = (project.findProperty("svara.abis") as String?) ?: "arm64-v8a"
        ndk { abiFilters += abis.split(",").map { it.trim() }.filter { it.isNotEmpty() } }
    }

    signingConfigs {
        // Kunci rilis opsional lewat env; kalau nggak ada, pakai kunci debug biar APK tetap bisa dipasang
        create("release") {
            val ks = System.getenv("SVARA_KEYSTORE")
            if (ks != null) {
                storeFile = file(ks)
                storePassword = System.getenv("SVARA_KEYSTORE_PASSWORD")
                keyAlias = System.getenv("SVARA_KEY_ALIAS") ?: "svara"
                keyPassword = System.getenv("SVARA_KEY_PASSWORD") ?: System.getenv("SVARA_KEYSTORE_PASSWORD")
            } else {
                val dbg = signingConfigs.getByName("debug")
                storeFile = dbg.storeFile
                storePassword = dbg.storePassword
                keyAlias = dbg.keyAlias
                keyPassword = dbg.keyPassword
            }
        }
    }

    buildTypes {
        release {
            // R8 buang kode androidx yang nggak kepakai (method @JavascriptInterface udah dijaga aturan bawaan)
            isMinifyEnabled = true
            isShrinkResources = true
            proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"))
            signingConfig = signingConfigs.getByName("release")
        }
    }

    buildFeatures { buildConfig = true }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    sourceSets["main"].assets.srcDir(layout.buildDirectory.dir("generated/svara-assets"))

    packaging {
        jniLibs.useLegacyPackaging = true
    }
}

chaquopy {
    defaultConfig {
        version = "3.12"
        System.getenv("SVARA_BUILD_PYTHON")?.let { buildPython(it) }
        pip {
            // yt-dlp + dependensi murni-Python (brotli/pycryptodomex dilewati: opsional & butuh native).
            // yt-dlp-ejs & websockets nggak dipasang: di Android nggak ada runtime JS, dan YouTube nggak butuh websocket
            install("yt-dlp")
            install("certifi")
            install("mutagen")
            install("requests")
            install("urllib3")
        }
        extractPackages("certifi")
    }
}

// File web + server.py dari root repo dibundel ke assets/web (disalin ke penyimpanan app pas pertama jalan)
val copyWeb by tasks.registering(Sync::class) {
    from(repoRoot) {
        include("index.html", "style.css", "app.js", "db.js", "sw.js", "manifest.webmanifest",
            "server.py", "ytworker.py", "favicon.png", "icon-192.png", "icon-512.png", "icon.svg", "assets/**")
    }
    into(layout.buildDirectory.dir("generated/svara-assets/web"))
}
tasks.named("preBuild") { dependsOn(copyWeb) }

dependencies {
    implementation("androidx.webkit:webkit:1.14.0")
    implementation("androidx.media:media:1.7.1")
    implementation("androidx.core:core:1.16.0")
}
