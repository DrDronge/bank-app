using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace bank.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddMatchText : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "MatchText",
                table: "RecurringExpenses",
                type: "text",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "MatchText",
                table: "RecurringExpenses");
        }
    }
}
