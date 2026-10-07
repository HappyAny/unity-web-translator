// Copyright (C) 2026 HappyAny. SPDX-License-Identifier: GPL-3.0-only
using System;
using System.Runtime.InteropServices;
using UnityEngine;
using UnityEngine.Events;

// Attach to a uniquely named GameObject. Connect onText to a Text/TMP text setter.
// Route the game's own dialogue assignment through ShowText before displaying it.
public sealed class UnityWebTextBridge : MonoBehaviour
{
    public enum TextKind { Story, Name, Ui }
    public TextKind kind = TextKind.Story;
    public string sceneId = "";
    public UnityEvent<string> onText = new UnityEvent<string>();
    private int generation;
    private string currentId;

    [Serializable] private sealed class Options { public string kind; public string speaker; public string scene; }
    [Serializable] private sealed class Result { public string id; public string text; }

#if UNITY_WEBGL && !UNITY_EDITOR
    [DllImport("__Internal")] private static extern void UWT_BindText(string target, string id, string text, string options);
    [DllImport("__Internal")] private static extern void UWT_ReleaseText(string target);
#endif

    public void ShowText(string text) { ShowDialogue(text, ""); }
    public void ShowDialogue(string text, string speaker)
    {
        text = text ?? "";
        currentId = GetInstanceID().ToString() + "-" + (++generation).ToString();
        onText.Invoke(text);
#if UNITY_WEBGL && !UNITY_EDITOR
        var options = new Options { kind = kind.ToString().ToLowerInvariant(), speaker = speaker ?? "", scene = sceneId ?? "" };
        UWT_BindText(gameObject.name, currentId, text, JsonUtility.ToJson(options));
#endif
    }

    // Invoked by this project's JavaScript plug-in, using Unity's SendMessage.
    public void OnTranslation(string json)
    {
        if (!isActiveAndEnabled || string.IsNullOrEmpty(currentId)) return;
        Result result;
        try { result = JsonUtility.FromJson<Result>(json); } catch (ArgumentException) { return; }
        if (result != null && result.id == currentId && result.text != null) onText.Invoke(result.text);
    }

    private void OnDisable()
    {
        currentId = null;
#if UNITY_WEBGL && !UNITY_EDITOR
        UWT_ReleaseText(gameObject.name);
#endif
    }
}
