using System;
using System.Collections.Generic;
using System.Data;
using Orchard.ContentManagement.Drivers;
using Orchard.ContentManagement.MetaData;
using Orchard.ContentManagement.MetaData.Builders;
using Orchard.Core.Contents.Extensions;
using Orchard.Data.Migration;

namespace JWPlayer {
    public class Migrations : DataMigrationImpl {

        public int Create() {
			// Creating table JWPlayerPartRecord
			SchemaBuilder.CreateTable("JWPlayerPartRecord", table => table
				.ContentPartRecord()
				.Column("PlayerSource", DbType.String)
				.Column("Height", DbType.Int32)
				.Column("Width", DbType.Int32)
				.Column("MediaFile", DbType.String)
				.Column("AutoStart", DbType.Boolean)
				.Column("Repeat", DbType.Boolean)
			);

            ContentDefinitionManager.AlterPartDefinition("JWPlayerPartRecord", builder => builder.Attachable());


            return 1;
        }
        
        public int UpdateFrom1()
        {

            ContentDefinitionManager.AlterTypeDefinition(
                "JWPlayerWidget", cfg => cfg
                .WithPart("JWPlayerPart")
                .WithPart("WidgetPart")
                .WithPart("CommonPart")
                .WithSetting("Stereotype", "Widget"));

            return 2;
        }
    }
}