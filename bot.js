require('dotenv').config();
const fs = require('node:fs');
const path = require('node:path');
const { Client, GatewayIntentBits, Partials, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle, ChannelType, PermissionsBitField, AttachmentBuilder } = require('discord.js');
const { GameDig } = require('gamedig');
const config = JSON.parse(fs.readFileSync(path.join(__dirname, 'config.json'), 'utf8'));
const store = require('./lib/store');
if (!process.env.DISCORD_TOKEN) throw new Error('ضع DISCORD_TOKEN داخل ملف .env');
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers, GatewayIntentBits.GuildMessages], partials: [Partials.Channel] });
const color = Number.parseInt((config.brand.color || '#D71920').replace('#',''), 16);
const embed = (title, description) => new EmbedBuilder().setColor(color).setTitle(title).setDescription(description).setFooter({ text: config.brand.footer || config.brand.name });
const hasStaff = member => member.permissions.has(PermissionsBitField.Flags.Administrator) || [config.roles.staffRoleId, config.roles.adminRoleId].filter(Boolean).some(id => member.roles.cache.has(id));
async function log(guild, title, description) { const id=config.channels.logsChannelId; if(!id) return; const ch=await guild.channels.fetch(id).catch(()=>null); if(ch?.isTextBased()) await ch.send({embeds:[embed(title,description)]}).catch(()=>{}); }
function ticketMenu(){ return new ActionRowBuilder().addComponents(new StringSelectMenuBuilder().setCustomId('nova_ticket_create').setPlaceholder('اختار نوع التذكرة').addOptions(config.tickets.types.slice(0,25).map((name,i)=>({label:name.slice(0,100),value:`type_${i}`,description:`فتح تذكرة: ${name}`.slice(0,100)})))); }
client.once('clientReady',()=>{ console.log(`Nova RolePlay bot online: ${client.user.tag}`); client.user.setActivity('Nova RolePlay | MTA'); });
client.on('guildMemberAdd', async member=>{ const id=config.channels.welcomeChannelId; if(!id)return; const ch=await member.guild.channels.fetch(id).catch(()=>null); if(ch?.isTextBased()) await ch.send({embeds:[embed('أهلًا بك في Nova RolePlay',`نورت السيرفر ${member}\nنتمنى لك وقتًا ممتعًا!`).setThumbnail(member.user.displayAvatarURL())]}).catch(()=>{}); });
client.on('guildMemberRemove', async member=>{ const id=config.channels.leaveChannelId; if(!id)return; const ch=await member.guild.channels.fetch(id).catch(()=>null); if(ch?.isTextBased()) await ch.send({embeds:[embed('مغادرة عضو',`غادر ${member.user.tag} السيرفر.`)]}).catch(()=>{}); });
client.on('interactionCreate', async interaction=>{
 try {
  if(interaction.isChatInputCommand()) {
   const {commandName}=interaction;
   if(commandName==='setup-ticket') { if(!interaction.memberPermissions?.has(PermissionsBitField.Flags.Administrator)) return interaction.reply({content:'الأمر للمسؤولين فقط.',ephemeral:true}); await interaction.reply({content:'تم إرسال لوحة التذاكر.',ephemeral:true}); await interaction.channel.send({embeds:[embed(config.tickets.panelTitle,config.tickets.panelDescription)],components:[ticketMenu()]}); return; }
   if(commandName==='ticket-close') { if(!interaction.channel?.topic?.includes('NOVA_TICKET')) return interaction.reply({content:'الأمر ده داخل تذكرة فقط.',ephemeral:true}); if(!hasStaff(interaction.member) && !interaction.channel.topic.includes(`OWNER:${interaction.user.id}`)) return interaction.reply({content:'مش معاك صلاحية تقفل التذكرة دي.',ephemeral:true}); await interaction.reply({content:'التذكرة هتتقفل بعد 5 ثواني.'}); await log(interaction.guild,'إغلاق تذكرة',`${interaction.user.tag} أغلق ${interaction.channel.name}`); setTimeout(()=>interaction.channel.delete().catch(()=>{}),5000); return; }
   if(commandName==='server-status') {
    if(!config.mta.enabled) return interaction.reply({embeds:[embed('حالة سيرفر MTA','حالة الربط غير مفعّلة بعد. عدّل إعدادات mta في config.json ثم أعد تشغيل البوت.')],ephemeral:true});
    await interaction.deferReply();
    const bannerPath = path.join(__dirname, 'assets', 'nova-roleplay-banner.png');
    const hasBanner = fs.existsSync(bannerPath);
    const banner = hasBanner ? new AttachmentBuilder(bannerPath, { name: 'nova-roleplay-banner.png' }) : null;
    try {
     const state=await GameDig.query({type:(!config.mta.type || config.mta.type === 'mtasa') ? 'gtasamta' : config.mta.type,host:config.mta.host,port:Number(config.mta.port),maxRetries:1,socketTimeout:5000,attemptTimeout:15000});
     const statusEmbed=embed('Nova RolePlay | MTA Status',`🟢 **الحالة:** Online\n👥 **اللاعبون:** ${state.players.length}/${state.maxplayers}\n🗺️ **الخريطة:** ${state.map||'غير معروف'}\n🌐 **السيرفر:** ${config.mta.host}:${config.mta.port}`);
     if (hasBanner) statusEmbed.setImage('attachment://nova-roleplay-banner.png');
     return interaction.editReply({embeds:[statusEmbed], ...(banner ? {files:[banner]} : {})});
    } catch (error) {
     console.error('[MTA server-status query failed]', error);
     const reason=String(error?.message||error||'Unknown error').slice(0,700);
     const statusEmbed=embed('Nova RolePlay | MTA Status',`🔴 **الحالة:** تعذّر الاستعلام\n🌐 **السيرفر:** ${config.mta.host}:${config.mta.port}\n\n**سبب الخطأ:** \`${reason.replace(/`/g, '\\`')}\`\n\nتأكد من منفذ MTA الرئيسي ومن فتح UDP في الاستضافة.`);
     if (hasBanner) statusEmbed.setImage('attachment://nova-roleplay-banner.png');
     return interaction.editReply({embeds:[statusEmbed], ...(banner ? {files:[banner]} : {})});
    }
   }
   if(commandName==='warn') { const user=interaction.options.getUser('member'); const reason=interaction.options.getString('reason'); const db=store.read(); db.warnings[user.id]??=[]; db.warnings[user.id].push({reason,by:interaction.user.id,at:new Date().toISOString()}); store.write(db); await interaction.reply({embeds:[embed('تم تسجيل تحذير',`العضو: ${user}\nالسبب: ${reason}\nعدد التحذيرات: ${db.warnings[user.id].length}`)]}); await log(interaction.guild,'تحذير جديد',`${user.tag} — ${reason} — بواسطة ${interaction.user.tag}`); return; }
   if(commandName==='warnings') { const user=interaction.options.getUser('member'); const list=store.read().warnings[user.id]||[]; return interaction.reply({embeds:[embed(`تحذيرات ${user.tag}`,list.length?list.map((w,i)=>`${i+1}. ${w.reason} — <@${w.by}>`).join('\n'):'لا توجد تحذيرات مسجلة.')],ephemeral:true}); }
   if(commandName==='clear') { const amount=interaction.options.getInteger('amount'); const deleted=await interaction.channel.bulkDelete(amount,true); await interaction.reply({content:`تم مسح ${deleted.size} رسالة.`,ephemeral:true}); await log(interaction.guild,'مسح رسائل',`${interaction.user.tag} مسح ${deleted.size} رسالة في ${interaction.channel}`); return; }
   if(commandName==='kick'||commandName==='ban') { const user=interaction.options.getUser('member'); const reason=interaction.options.getString('reason')||'لم يتم تحديد سبب'; const member=await interaction.guild.members.fetch(user.id).catch(()=>null); if(!member) return interaction.reply({content:'العضو غير موجود في السيرفر.',ephemeral:true}); if(commandName==='kick') await member.kick(reason); else await member.ban({reason}); await interaction.reply({content:`تم ${commandName==='kick'?'طرد':'حظر'} ${user.tag}.`}); await log(interaction.guild,commandName==='kick'?'طرد عضو':'حظر عضو',`${user.tag} — ${reason} — بواسطة ${interaction.user.tag}`); return; }
   if(commandName==='announce') { const ch=interaction.options.getChannel('channel'); const message=interaction.options.getString('message'); await ch.send({embeds:[embed('Nova RolePlay | إعلان',message)]}); return interaction.reply({content:`تم إرسال الإعلان في ${ch}.`,ephemeral:true}); }
  }
  if(interaction.isStringSelectMenu() && interaction.customId==='nova_ticket_create') {
   await interaction.deferReply({ephemeral:true}); const guild=interaction.guild; const db=store.read(); const existing=guild.channels.cache.find(c=>c.type===ChannelType.GuildText && c.topic?.includes(`OWNER:${interaction.user.id}`) && c.topic?.includes('NOVA_TICKET')); if(existing) return interaction.editReply(`عندك تذكرة مفتوحة بالفعل: ${existing}`);
   const idx=Number(interaction.values[0].replace('type_','')); const type=config.tickets.types[idx]||'دعم فني'; const num=String(db.nextTicket++).padStart(4,'0'); store.write(db);
   const overwrites=[{id:guild.roles.everyone.id,deny:[PermissionsBitField.Flags.ViewChannel]},{id:interaction.user.id,allow:[PermissionsBitField.Flags.ViewChannel,PermissionsBitField.Flags.SendMessages,PermissionsBitField.Flags.ReadMessageHistory,PermissionsBitField.Flags.AttachFiles]},{id:client.user.id,allow:[PermissionsBitField.Flags.ViewChannel,PermissionsBitField.Flags.SendMessages,PermissionsBitField.Flags.ReadMessageHistory,PermissionsBitField.Flags.ManageChannels]}]; if(config.roles.staffRoleId) overwrites.push({id:config.roles.staffRoleId,allow:[PermissionsBitField.Flags.ViewChannel,PermissionsBitField.Flags.SendMessages,PermissionsBitField.Flags.ReadMessageHistory]});
   const opts={name:`ticket-${num}`,type:ChannelType.GuildText,topic:`NOVA_TICKET | OWNER:${interaction.user.id} | NUMBER:${num} | TYPE:${type}`,permissionOverwrites:overwrites}; if(config.channels.ticketCategoryId) { const cat=await guild.channels.fetch(config.channels.ticketCategoryId).catch(()=>null); if(cat?.type===ChannelType.GuildCategory) opts.parent=cat.id; }
   const ch=await guild.channels.create(opts); const row=new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('nova_ticket_close').setLabel('إغلاق التذكرة').setStyle(ButtonStyle.Danger)); await ch.send({content:`${interaction.user}${config.roles.staffRoleId?` <@&${config.roles.staffRoleId}>`:''}`,embeds:[embed(`تذكرة #${num} — ${type}`,`أهلًا ${interaction.user}، اشرح مشكلتك بالتفصيل وسيقوم فريق Nova بمساعدتك.\n\n**النوع:** ${type}\n**رقم التذكرة:** ${num}`)],components:[row]}); await interaction.editReply(`تم فتح تذكرتك: ${ch}`); await log(guild,'تذكرة جديدة',`#${num} — ${type} — ${interaction.user.tag} — ${ch}`); return;
  }
  if(interaction.isButton() && interaction.customId==='nova_ticket_close') { if(!interaction.channel?.topic?.includes('NOVA_TICKET')) return interaction.reply({content:'دي مش قناة تذكرة.',ephemeral:true}); const owner=(interaction.channel.topic.match(/OWNER:(\d+)/)||[])[1]; if(interaction.user.id!==owner && !hasStaff(interaction.member)) return interaction.reply({content:'صاحب التذكرة أو فريق الدعم فقط يقدر يقفلها.',ephemeral:true}); await interaction.reply({content:'سيتم إغلاق التذكرة بعد 5 ثواني.'}); await log(interaction.guild,'إغلاق تذكرة',`${interaction.user.tag} أغلق ${interaction.channel.name}`); setTimeout(()=>interaction.channel.delete().catch(()=>{}),5000); }
 } catch(error) { console.error('Nova bot interaction error:',error); const msg='حصل خطأ أثناء تنفيذ الأمر. راجع Console وإعدادات القنوات والرتب.'; if(interaction.isRepliable()) { if(interaction.deferred) await interaction.editReply({content:msg}).catch(()=>{}); else if(!interaction.replied) await interaction.reply({content:msg,ephemeral:true}).catch(()=>{}); } }
});
client.login(process.env.DISCORD_TOKEN);
