package com.openscreentime.app.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

private val Purple = Color(0xFF6366F1)
private val Cyan = Color(0xFF22D3EE)

private val DarkColors = darkColorScheme(
    primary = Purple,
    secondary = Cyan,
)

private val LightColors = lightColorScheme(
    primary = Purple,
    secondary = Cyan,
)

@Composable
fun OpenScreenTimeTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit,
) {
    val colorScheme = if (darkTheme) DarkColors else LightColors
    MaterialTheme(colorScheme = colorScheme, content = content)
}
