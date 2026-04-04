using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace bank.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class RenameLastPaidToEndDate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn(
                name: "LastPaidDate",
                table: "RecurringExpenses",
                newName: "EndDate");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn(
                name: "EndDate",
                table: "RecurringExpenses",
                newName: "LastPaidDate");
        }
    }
}
