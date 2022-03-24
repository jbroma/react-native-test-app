// This file was generated by generate-manifest.js.
// DO NOT MODIFY. ALL CHANGES WILL BE OVERWRITTEN.

package com.microsoft.reacttestapp.manifest

import android.os.Bundle
import com.squareup.moshi.JsonClass

@JsonClass(generateAdapter = true)
data class Component(
    val appKey: String,
    val displayName: String?,
    val initialProperties: Bundle?,
    val presentationStyle: String?,
    val slug: String?,
)

@JsonClass(generateAdapter = true)
data class Manifest(
    val name: String,
    val displayName: String,
    val bundleRoot: String?,
    val singleApp: String?,
    val components: List<Component>?,
)
