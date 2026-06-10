import { useState, useEffect } from "react";
import { Loader2, Save, MessageSquare, TerminalSquare, Users, Hash } from "lucide-react";
import { TagSelection, AliasTagInput } from "./components/TagSelection";
import { gT } from "./i18n";
export function GuildConfigView({ guildId, siteLang, onDirtyChange }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [roles, setRoles] = useState([]);
  const [channels, setChannels] = useState([]);
  const [config, setConfig] = useState({
    language: "ar",
    commands: {
      clear: { aliases: [], channels: [], roles: [] },
      kick: { aliases: [], channels: [], roles: [] },
      ban: { aliases: [], channels: [], roles: [] },
      serverinfo: { aliases: [], channels: [], roles: [] },
      role: { aliases: [], channels: [], roles: [] },
      lock: { aliases: [], channels: [], roles: [] },
      unlock: { aliases: [], channels: [], roles: [] },
      timeout: { aliases: [], channels: [], roles: [] },
      hide: { aliases: [], channels: [], roles: [] },
      warn: { aliases: [], channels: [], roles: [] },
      unwarn: { aliases: [], channels: [], roles: [] },
      warnings: { aliases: [], channels: [], roles: [] }
    }
  });
  useEffect(() => {
    Promise.all([
      fetch(`/api/guilds/${guildId}/config`).then((res) => res.json()),
      fetch(`/api/guilds/${guildId}/roles-channels`).then((res) => res.json())
    ]).then(([configData, structureData]) => {
      const baseCmds = {
        clear: { aliases: [], channels: [], roles: [] },
        kick: { aliases: [], channels: [], roles: [] },
        ban: { aliases: [], channels: [], roles: [] },
        serverinfo: { aliases: [], channels: [], roles: [] },
        role: { aliases: [], channels: [], roles: [] },
        lock: { aliases: [], channels: [], roles: [] },
        unlock: { aliases: [], channels: [], roles: [] },
        timeout: { aliases: [], channels: [], roles: [] },
        hide: { aliases: [], channels: [], roles: [] },
        warn: { aliases: [], channels: [], roles: [] },
        unwarn: { aliases: [], channels: [], roles: [] },
        warnings: { aliases: [], channels: [], roles: [] },
        script: { aliases: [], channels: [], roles: [] },
        fscript: { aliases: [], channels: [], roles: [] }
      };
      setConfig({
        language: configData.language || "ar",
        commands: { ...baseCmds, ...configData.commands || {} }
      });
      if (structureData.roles) setRoles(structureData.roles);
      if (structureData.channels) setChannels(structureData.channels);
      setLoading(false);
    });
  }, [guildId]);

  const handleSave = async () => {
    setSaving(true);
    await fetch(`/api/guilds/${guildId}/config`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(config)
    });
    window.dispatchEvent(new CustomEvent("show-toast", {
      detail: { message: gT[siteLang].saveSuccess, type: "success" }
    }));
    if (onDirtyChange) onDirtyChange(false);
    setTimeout(() => setSaving(false), 500);
  };

  useEffect(() => {
    const handleTriggerSave = () => {
      handleSave();
    };
    const handleTriggerCancel = () => {
      setLoading(true);
      Promise.all([
        fetch(`/api/guilds/${guildId}/config`).then((res) => res.json()),
        fetch(`/api/guilds/${guildId}/roles-channels`).then((res) => res.json())
      ]).then(([configData, structureData]) => {
        const baseCmds = {
          clear: { aliases: [], channels: [], roles: [] },
          kick: { aliases: [], channels: [], roles: [] },
          ban: { aliases: [], channels: [], roles: [] },
          serverinfo: { aliases: [], channels: [], roles: [] },
          role: { aliases: [], channels: [], roles: [] },
          lock: { aliases: [], channels: [], roles: [] },
          unlock: { aliases: [], channels: [], roles: [] },
          timeout: { aliases: [], channels: [], roles: [] },
          hide: { aliases: [], channels: [], roles: [] },
          warn: { aliases: [], channels: [], roles: [] },
          unwarn: { aliases: [], channels: [], roles: [] },
          warnings: { aliases: [], channels: [], roles: [] },
          script: { aliases: [], channels: [], roles: [] },
          fscript: { aliases: [], channels: [], roles: [] }
        };
        setConfig({
          language: configData.language || "ar",
          commands: { ...baseCmds, ...configData.commands || {} }
        });
        if (structureData.roles) setRoles(structureData.roles);
        if (structureData.channels) setChannels(structureData.channels);
        setLoading(false);
        if (onDirtyChange) onDirtyChange(false);
      });
    };

    window.addEventListener("trigger-save", handleTriggerSave);
    window.addEventListener("trigger-cancel", handleTriggerCancel);
    return () => {
      window.removeEventListener("trigger-save", handleTriggerSave);
      window.removeEventListener("trigger-cancel", handleTriggerCancel);
    };
  }, [config, guildId]);

  const updateCmd = (cmd, field, value) => {
    setConfig((prev) => ({
      ...prev,
      commands: {
        ...prev.commands,
        [cmd]: { ...prev.commands[cmd], [field]: value }
      }
    }));
    if (onDirtyChange) onDirtyChange(true);
  };
  const toggleCmdChannel = (cmdId, channelId) => {
    const current = config.commands[cmdId].channels || [];
    const newVal = current.includes(channelId) ? current.filter((id) => id !== channelId) : [...current, channelId];
    updateCmd(cmdId, "channels", newVal);
  };
  const toggleCmdRole = (cmdId, roleId) => {
    const current = config.commands[cmdId].roles || [];
    const newVal = current.includes(roleId) ? current.filter((id) => id !== roleId) : [...current, roleId];
    updateCmd(cmdId, "roles", newVal);
  };
  if (loading) {
    return <div className="flex h-64 items-center justify-center">
        <Loader2 className="animate-spin text-indigo-500 w-8 h-8" />
      </div>;
  }
  const configurableCommands = [
    { id: "clear", title: gT[siteLang].clearTitle, desc: gT[siteLang].clearDesc },
    { id: "kick", title: gT[siteLang].kickTitle, desc: gT[siteLang].kickDesc },
    { id: "ban", title: gT[siteLang].banTitle, desc: gT[siteLang].banDesc },
    { id: "serverinfo", title: gT[siteLang].infoTitle, desc: gT[siteLang].infoDesc },
    { id: "role", title: gT[siteLang].roleTitle, desc: gT[siteLang].roleDesc },
    { id: "lock", title: gT[siteLang].lockTitle, desc: gT[siteLang].lockDesc },
    { id: "unlock", title: gT[siteLang].unlockTitle, desc: gT[siteLang].unlockDesc },
    { id: "timeout", title: gT[siteLang].timeoutTitle, desc: gT[siteLang].timeoutDesc },
    { id: "hide", title: gT[siteLang].hideTitle, desc: gT[siteLang].hideDesc },
    { id: "warn", title: gT[siteLang].warnTitle, desc: gT[siteLang].warnDesc },
    { id: "unwarn", title: gT[siteLang].unwarnTitle, desc: gT[siteLang].unwarnDesc },
    { id: "warnings", title: gT[siteLang].warningsTitle, desc: gT[siteLang].warningsDesc },
    { id: "script", title: gT[siteLang].scriptTitle, desc: gT[siteLang].scriptDesc },
    { id: "fscript", title: gT[siteLang].fscriptTitle, desc: gT[siteLang].fscriptDesc }
  ];
  return <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      
      {
    /* Commands Configuration */
  }
      <div className="bg-black/20 border border-white/5 rounded-2xl p-6 backdrop-blur-sm shadow-xl">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 flex items-center justify-center bg-emerald-500/20 rounded-xl border border-emerald-500/20">
            <TerminalSquare className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h4 className="text-lg font-black text-white leading-tight">{gT[siteLang].cmdConfigTitle}</h4>
            <p className="text-[10px] text-slate-400 mt-0.5 uppercase font-bold tracking-wider">{gT[siteLang].cmdConfigDesc}</p>
          </div>
        </div>

        <div className="space-y-4">
          {configurableCommands.map((cmd) => {
    const cmdConf = config.commands[cmd.id] || { alias: "", channels: [], roles: [] };
    return <div key={cmd.id} className="bg-white/[0.02] border border-white/5 rounded-xl p-4">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h5 className="text-base font-bold text-white font-mono tracking-wide">{cmd.title}</h5>
                    <p className="text-xs text-slate-500 mt-0.5">{cmd.desc}</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {
      /* Alias */
    }
                  <div>
                    <label className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">
                      <MessageSquare className="w-3.5 h-3.5 text-sky-500" /> {gT[siteLang].txtAlias}
                    </label>
                    <AliasTagInput
      aliases={cmdConf.aliases || []}
      onChange={(newVal) => updateCmd(cmd.id, "aliases", newVal)}
      placeholder={gT[siteLang].txtAlias}
      isAr={siteLang === "ar"}
    />
                  </div>
                  
                  {
      /* Channels */
    }
                  <div>
                    <label className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">
                      <Hash className="w-3.5 h-3.5 text-emerald-500" /> {gT[siteLang].allowedChs}
                    </label>
                    <TagSelection
      items={channels}
      selectedIds={cmdConf.channels}
      onToggle={(id) => toggleCmdChannel(cmd.id, id)}
      placeholder={gT[siteLang].allowedChs}
      isAr={siteLang === "ar"}
    />
                  </div>
                  
                  {
      /* Roles */
    }
                  <div>
                    <label className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">
                      <Users className="w-3.5 h-3.5 text-indigo-500" /> {gT[siteLang].allowedRoles}
                    </label>
                    <TagSelection
      items={roles}
      selectedIds={cmdConf.roles}
      onToggle={(id) => toggleCmdRole(cmd.id, id)}
      placeholder={gT[siteLang].allowedRoles}
      type="role"
      isAr={siteLang === "ar"}
    />
                  </div>
                </div>
              </div>;
  })}
        </div>
        
        <div className="mt-6 flex justify-end">
          <button
    onClick={handleSave}
    disabled={saving}
    className="flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-600/50 text-white rounded-xl font-black shadow-lg transition-all text-sm uppercase tracking-wide"
  >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? gT[siteLang].saving : gT[siteLang].saveBtn}
          </button>
        </div>
      </div>
    </div>;
}
